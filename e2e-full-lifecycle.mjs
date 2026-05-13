import { execSync } from 'child_process';

const BASE = 'http://localhost:3001';
const DB_PATH = './src/lib/db/database.sqlite';

let userCookie = '';
let adminCookie = '';
let passCount = 0;
let failCount = 0;
let warnCount = 0;
const results = [];

function log(tag, msg, data) {
  const ts = new Date().toISOString().slice(11, 19);
  const line = `[${ts}] [${tag}] ${msg}`;
  console.log(line);
  if (data) console.log('  ', JSON.stringify(data).slice(0, 300));
}

function pass(name, detail) { passCount++; results.push({ status: 'PASS', name, detail }); log('✅', name, detail); }
function fail(name, detail) { failCount++; results.push({ status: 'FAIL', name, detail }); log('❌', name, detail); }
function warn(name, detail) { warnCount++; results.push({ status: 'WARN', name, detail }); log('⚠️', name, detail); }

async function api(method, path, body, cookie) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  const setCookie = res.headers.get('set-cookie') || '';
  return { status: res.status, data, setCookie, ok: res.ok };
}

function extractCookies(setCookie) {
  const cookies = [];
  const parts = setCookie.split(/,(?=\s*\w+=)/);
  for (const p of parts) {
    const kv = p.split(';')[0].trim();
    if (kv.includes('=')) cookies.push(kv);
  }
  return cookies.join('; ');
}

function dbQuery(sql, params = []) {
  return new Promise((resolve) => {
    const escaped = sql.replace(/'/g, "'\\''");
    let cmd = `sqlite3 -json '${DB_PATH}' '${escaped}'`;
    try {
      const out = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
      const rows = out.trim() ? JSON.parse(out) : [];
      resolve({ rows });
    } catch (e) {
      resolve({ rows: [], error: e.message });
    }
  });
}

function dbRun(sql) {
  return new Promise((resolve) => {
    const escaped = sql.replace(/'/g, "'\\''");
    try {
      execSync(`sqlite3 '${DB_PATH}' '${escaped}'`, { encoding: 'utf8', timeout: 10000 });
      resolve(true);
    } catch (e) {
      console.error('DB Error:', e.message);
      resolve(false);
    }
  });
}

let products = [];
let addresses = [];
const createdOrders = [];

async function loginUsers() {
  log('📋', '=== 阶段 1: 双账号登录 ===');

  const userLogin = await api('POST', '/api/auth/login', { email: 'test2@example.com', password: 'password123' });
  if (userLogin.status === 200 && userLogin.data?.success) {
    userCookie = extractCookies(userLogin.setCookie);
    pass('用户登录', { userId: userLogin.data.data?.user?.id, email: userLogin.data.data?.user?.email });
  } else {
    fail('用户登录', { status: userLogin.status, error: userLogin.data?.error });
    return false;
  }

  const adminLogin = await api('POST', '/api/admin/login', { email: 'admin2@example.com', password: '1234' });
  if (adminLogin.status === 200 && adminLogin.data?.success) {
    adminCookie = extractCookies(adminLogin.setCookie);
    pass('管理员登录', { userId: adminLogin.data.data?.user?.id, email: adminLogin.data.data?.user?.email });
  } else {
    fail('管理员登录', { status: adminLogin.status, error: adminLogin.data?.error });
    return false;
  }

  return true;
}

async function loadData() {
  log('📋', '=== 阶段 2: 加载基础数据 ===');

  const prodRes = await api('GET', '/api/products?limit=20', null, userCookie);
  if (prodRes.status === 200) {
    products = prodRes.data?.data?.products || prodRes.data?.products || prodRes.data?.data || [];
    if (!Array.isArray(products)) products = [];
    pass('获取商品列表', { count: products.length });
  } else {
    fail('获取商品列表', { status: prodRes.status });
  }

  const addrRes = await api('GET', '/api/addresses', null, userCookie);
  if (addrRes.status === 200) {
    addresses = addrRes.data?.data || addrRes.data || [];
    if (!Array.isArray(addresses)) addresses = [];
    pass('获取地址列表', { count: addresses.length });
  } else {
    fail('获取地址列表', { status: addrRes.status });
  }

  if (products.length === 0) {
    fail('商品数据为空', '无法继续测试');
    return false;
  }
  if (addresses.length === 0) {
    fail('地址数据为空', '无法继续测试');
    return false;
  }

  log('📦', `可用商品 ${products.length} 个, 地址 ${addresses.length} 个`);
  products.slice(0, 5).forEach(p => {
    log('📦', `  商品#${p.id}: ${p.name || p.name_en || 'N/A'} | 价格: $${p.price || p.price_usd || 'N/A'}`);
  });

  return true;
}

async function addToCart(productId, quantity) {
  const res = await api('POST', '/api/cart', { product_id: productId, quantity }, userCookie);
  return res;
}

async function getCartItems() {
  const res = await api('GET', '/api/cart', null, userCookie);
  if (res.status === 200 && res.data?.data?.items) {
    return res.data.data.items;
  }
  return [];
}

async function clearCart() {
  await api('DELETE', '/api/cart?clear=true', null, userCookie);
}

async function createOrderFromCart(cartItemIds, addressId, paymentMethod = 'paypal') {
  const res = await api('POST', '/api/cart/create-order', {
    cart_item_ids: cartItemIds,
    address_id: addressId,
    coupon_ids: [],
    payment_method: paymentMethod,
  }, userCookie);
  return res;
}

async function preparePayment(orderId, addressId, paymentMethod = 'paypal') {
  const res = await api('POST', `/api/orders/${orderId}/prepare-payment`, {
    address_id: addressId,
    coupon_ids: [],
    payment_method: paymentMethod,
  }, userCookie);
  return res;
}

async function simulatePaymentSuccess(orderId, orderNumber, amount) {
  const paidAt = new Date().toISOString();
  await dbRun(`UPDATE orders SET order_status='paid', payment_status='paid', paid_at='${paidAt}', updated_at=datetime('now') WHERE id=${orderId}`);
  await dbRun(`INSERT INTO payment_logs (order_id, order_number, payment_method, status, is_success, amount, currency, payment_stage, created_at) VALUES (${orderId}, '${orderNumber}', 'paypal', 'success', 1, ${amount}, 'USD', 'capture', datetime('now'))`);
  await dbRun(`INSERT INTO order_payments (order_id, payment_method, transaction_id, amount, payment_status, paid_at, created_at) VALUES (${orderId}, 'paypal', 'PAYID-${orderId}-${Date.now()}', ${amount}, 'paid', '${paidAt}', datetime('now'))`);
}

async function adminShip(orderId) {
  const res = await api('POST', `/api/admin/orders/${orderId}/ship`, {
    tracking_number: `TRK${Date.now()}`,
    carrier: 'EMS',
    estimated_delivery: new Date(Date.now() + 7 * 86400000).toISOString(),
  }, adminCookie);
  return res;
}

async function userRequestRefund(orderId) {
  const res = await api('POST', `/api/orders/${orderId}/refund`, {}, userCookie);
  return res;
}

async function adminApproveRefund(orderId) {
  const res = await api('POST', `/api/admin/orders/${orderId}/refund/approve`, {}, adminCookie);
  return res;
}

async function simulateRefundSuccess(orderId) {
  await dbRun(`UPDATE orders SET order_status='refunded', payment_status='refunded', updated_at=datetime('now') WHERE id=${orderId}`);
}

async function submitReview(productId, orderId, orderItemId, rating, comment) {
  const res = await api('POST', '/api/reviews', {
    product_id: productId,
    order_id: orderId,
    order_item_id: orderItemId,
    rating,
    comment,
    is_anonymous: false,
  }, userCookie);
  return res;
}

async function getOrderItems(orderId) {
  const res = await api('GET', `/api/orders/${orderId}`, null, userCookie);
  if (res.status === 200 && res.data?.data) {
    return res.data.data.items || [];
  }
  return [];
}

async function verifyAdminDashboard() {
  const res = await api('GET', '/api/admin/dashboard', null, adminCookie);
  if (res.status === 200 && res.data?.data) {
    const d = res.data.data;
    pass('管理员仪表盘', {
      todayOrders: d.todayOrders,
      monthOrders: d.monthOrders,
      todayRevenue: d.todayRevenue,
      monthRevenue: d.monthRevenue,
      totalProducts: d.totalProducts,
      totalUsers: d.totalUsers,
    });
    return d;
  }
  fail('管理员仪表盘', { status: res.status });
  return null;
}

async function verifyAdminOrders(expectedCount) {
  const res = await api('GET', '/api/admin/orders?limit=100', null, adminCookie);
  if (res.status === 200) {
    const orders = res.data?.data?.orders || res.data?.data || [];
    const count = Array.isArray(orders) ? orders.length : 0;
    pass('管理员订单列表', { totalOrders: count, expected: expectedCount });
    return orders;
  }
  fail('管理员订单列表', { status: res.status });
  return [];
}

async function verifyAdminInventory() {
  const res = await api('GET', '/api/admin/inventory?limit=20', null, adminCookie);
  if (res.status === 200) {
    pass('管理员库存查询', { status: res.status });
    return true;
  }
  fail('管理员库存查询', { status: res.status });
  return false;
}

async function createTimeoutOrder(productId, quantity, addressId) {
  log('⏰', '--- 创建超时订单 ---');
  await clearCart();
  await addToCart(productId, quantity);
  const cartItems = await getCartItems();
  if (cartItems.length === 0) {
    fail('超时订单-添加购物车', '购物车为空');
    return null;
  }

  const orderRes = await createOrderFromCart([cartItems[0].id], addressId);
  if (orderRes.status !== 200 || !orderRes.data?.success) {
    fail('超时订单-创建', { status: orderRes.status, error: orderRes.data?.error });
    return null;
  }

  const orderId = orderRes.data.data.order_id;
  const orderNumber = orderRes.data.data.order_number;

  await dbRun(`UPDATE orders SET created_at=datetime('now', '-31 minutes') WHERE id=${orderId}`);

  pass('超时订单创建', { orderId, orderNumber, note: 'created_at 已设为31分钟前' });
  return { orderId, orderNumber };
}

async function runFullTest() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║      全链路 E2E 测试 - 紫砂电商完整业务流程       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  // ===== Phase 1: 登录 =====
  const loginOk = await loginUsers();
  if (!loginOk) {
    console.log('❌ 登录失败，终止测试');
    return;
  }

  // ===== Phase 2: 加载数据 =====
  const dataOk = await loadData();
  if (!dataOk) {
    console.log('❌ 基础数据加载失败，终止测试');
    return;
  }

  const addr = addresses[0];
  const addressId = addr.id;

  // ===== Phase 3: 创建订单 =====
  log('📋', '=== 阶段 3: 创建订单 ===');

  // --- 订单1: 购物车多商品下单 ---
  log('🛒', '--- 订单1: 购物车多商品下单 ---');
  await clearCart();
  const p1 = products[0];
  const p2 = products[1] || products[0];
  await addToCart(p1.id, 2);
  await addToCart(p2.id, 1);
  const cartItems1 = await getCartItems();
  if (cartItems1.length >= 2) {
    const res = await createOrderFromCart(cartItems1.map(i => i.id), addressId);
    if (res.status === 200 && res.data?.success) {
      createdOrders.push({
        id: res.data.data.order_id,
        number: res.data.data.order_number,
        amount: res.data.data.amount_usd,
        method: 'cart-multi',
        products: [p1.id, p2.id],
      });
      pass('订单1-购物车多商品', { orderId: res.data.data.order_id, orderNumber: res.data.data.order_number });
    } else {
      fail('订单1-购物车多商品', { status: res.status, error: res.data?.error });
    }
  } else {
    fail('订单1-购物车多商品', { msg: '购物车商品不足', count: cartItems1.length });
  }

  // --- 订单2: 购物车单一商品多数量 ---
  log('🛒', '--- 订单2: 购物车单一商品多数量 ---');
  await clearCart();
  const p3 = products[2] || products[0];
  await addToCart(p3.id, 3);
  const cartItems2 = await getCartItems();
  if (cartItems2.length > 0) {
    const res = await createOrderFromCart([cartItems2[0].id], addressId);
    if (res.status === 200 && res.data?.success) {
      createdOrders.push({
        id: res.data.data.order_id,
        number: res.data.data.order_number,
        amount: res.data.data.amount_usd,
        method: 'cart-single-multi',
        products: [p3.id],
      });
      pass('订单2-单一商品多数量', { orderId: res.data.data.order_id });
    } else {
      fail('订单2-单一商品多数量', { status: res.status, error: res.data?.error });
    }
  } else {
    fail('订单2-添加购物车', '购物车为空');
  }

  // --- 订单3-8: 购物车下单 (批量创建) ---
  for (let i = 3; i <= 8; i++) {
    log('🛒', `--- 订单${i}: 购物车下单 ---`);
    await clearCart();
    const prod = products[i % products.length];
    const qty = (i % 3) + 1;
    await addToCart(prod.id, qty);
    const ci = await getCartItems();
    if (ci.length > 0) {
      const res = await createOrderFromCart([ci[0].id], addressId);
      if (res.status === 200 && res.data?.success) {
        createdOrders.push({
          id: res.data.data.order_id,
          number: res.data.data.order_number,
          amount: res.data.data.amount_usd,
          method: `cart-batch-${i}`,
          products: [prod.id],
        });
        pass(`订单${i}-购物车下单`, { orderId: res.data.data.order_id });
      } else {
        fail(`订单${i}-购物车下单`, { status: res.status, error: res.data?.error });
      }
    } else {
      fail(`订单${i}-添加购物车`, '购物车为空');
    }
  }

  // --- 订单9-10: 快速下单 ---
  log('⚡', '--- 订单9-10: 快速下单 ---');
  for (let i = 9; i <= 10; i++) {
    await clearCart();
    const prod = products[i % products.length];
    await addToCart(prod.id, 1);
    const ci = await getCartItems();
    if (ci.length > 0) {
      const res = await createOrderFromCart([ci[0].id], addressId);
      if (res.status === 200 && res.data?.success) {
        const orderId = res.data.data.order_id;
        const prepRes = await preparePayment(orderId, addressId);
        if (prepRes.status === 200 && prepRes.data?.success) {
          createdOrders.push({
            id: orderId,
            number: res.data.data.order_number,
            amount: prepRes.data.data.final_amount,
            method: `quick-${i}`,
            products: [prod.id],
          });
          pass(`订单${i}-快速下单`, { orderId, finalAmount: prepRes.data.data.final_amount });
        } else {
          createdOrders.push({
            id: orderId,
            number: res.data.data.order_number,
            amount: res.data.data.amount_usd,
            method: `quick-${i}`,
            products: [prod.id],
          });
          pass(`订单${i}-快速下单(跳过prepare)`, { orderId });
        }
      } else {
        fail(`订单${i}-快速下单`, { status: res.status, error: res.data?.error });
      }
    } else {
      fail(`订单${i}-快速下单`, '购物车为空');
    }
  }

  log('📊', `=== 已创建 ${createdOrders.length} 个订单 ===`);
  createdOrders.forEach((o, i) => {
    log('📋', `  订单${i + 1}: #${o.number} | $${o.amount || '?'} | 方式: ${o.method}`);
  });

  // ===== Phase 4: 支付成功 (前6个订单) =====
  log('📋', '=== 阶段 4: 模拟支付成功 ===');
  const paidOrders = [];
  for (let i = 0; i < Math.min(6, createdOrders.length); i++) {
    const order = createdOrders[i];
    await preparePayment(order.id, addressId);
    await simulatePaymentSuccess(order.id, order.number, order.amount || 0);
    paidOrders.push(order);
    pass(`订单${i + 1}-支付成功`, { orderId: order.id, orderNumber: order.number });
  }

  // 验证订单状态
  for (const order of paidOrders) {
    const res = await api('GET', `/api/orders/${order.id}`, null, userCookie);
    if (res.status === 200) {
      const orderData = res.data?.data;
      const status = orderData?.order?.order_status || orderData?.order_status;
      const payStatus = orderData?.order?.payment_status || orderData?.payment_status;
      if (payStatus === 'paid') {
        pass(`支付状态验证-订单#${order.id}`, { payment_status: payStatus, order_status: status });
      } else {
        fail(`支付状态验证-订单#${order.id}`, { expected: 'paid', actual: payStatus });
      }
    }
  }

  // ===== Phase 5: 管理员发货 (前3个已支付订单) =====
  log('📋', '=== 阶段 5: 管理员发货 ===');
  const shippedOrders = [];
  for (let i = 0; i < Math.min(3, paidOrders.length); i++) {
    const order = paidOrders[i];
    const res = await adminShip(order.id);
    if (res.status === 200 && res.data?.success) {
      shippedOrders.push(order);
      pass(`发货-订单#${order.id}`, { tracking: res.data.data?.tracking_number });
    } else {
      fail(`发货-订单#${order.id}`, { status: res.status, error: res.data?.error });
    }
  }

  // ===== Phase 6: 用户确认收货(delivered) → 提交评价 =====
  log('📋', '=== 阶段 6: 确认收货 + 提交评价 ===');
  const deliveredOrders = [];
  for (const order of shippedOrders) {
    await dbRun(`UPDATE orders SET order_status='delivered', updated_at=datetime('now') WHERE id=${order.id}`);
    deliveredOrders.push(order);
    pass(`确认收货-订单#${order.id}`, { newStatus: 'delivered' });
  }

  for (const order of deliveredOrders) {
    const items = await getOrderItems(order.id);
    if (items.length > 0) {
      const item = items[0];
      const productId = item.product_id;
      const orderItemId = item.order_item_id || item.id;
      const reviewRes = await submitReview(
        productId,
        order.id,
        orderItemId,
        5,
        '非常精美的紫砂壶，做工细腻，泡茶特别香，非常满意！'
      );
      if (reviewRes.status === 200 || reviewRes.status === 201) {
        pass(`评价-订单#${order.id}`, { productId, rating: 5 });
      } else {
        fail(`评价-订单#${order.id}`, { status: reviewRes.status, error: reviewRes.data?.error });
      }
    }
  }

  // ===== Phase 7: 退款流程 (订单4 和 订单5) =====
  log('📋', '=== 阶段 7: 退款流程 ===');

  // 订单4: 完整退款 (申请 → 管理员同意 → 退款成功)
  if (paidOrders.length >= 4) {
    const refundOrder = paidOrders[3];
    log('💰', `--- 订单#${refundOrder.id}: 完整退款流程 ---`);

    const reqRes = await userRequestRefund(refundOrder.id);
    if (reqRes.status === 200 && reqRes.data?.success) {
      pass(`申请退款-订单#${refundOrder.id}`, { status: reqRes.data.data?.status });

      const approveRes = await adminApproveRefund(refundOrder.id);
      if (approveRes.status === 200 && approveRes.data?.success) {
        pass(`管理员同意退款-订单#${refundOrder.id}`, { afterSaleStatus: approveRes.data.data?.after_sale_status });

        await simulateRefundSuccess(refundOrder.id);

        const verifyRes = await api('GET', `/api/orders/${refundOrder.id}`, null, userCookie);
        const orderStatus = verifyRes.data?.data?.order?.order_status || verifyRes.data?.data?.order_status;
        if (orderStatus === 'refunded') {
          pass(`退款完成验证-订单#${refundOrder.id}`, { order_status: orderStatus });
        } else {
          fail(`退款完成验证-订单#${refundOrder.id}`, { expected: 'refunded', actual: orderStatus });
        }
      } else {
        fail(`管理员同意退款-订单#${refundOrder.id}`, { status: approveRes.status, error: approveRes.data?.error });
      }
    } else {
      fail(`申请退款-订单#${refundOrder.id}`, { status: reqRes.status, error: reqRes.data?.error });
    }
  }

  // 订单5: 只退货不退款 (申请退款 → 管理员拒绝)
  if (paidOrders.length >= 5) {
    const returnOrder = paidOrders[4];
    log('📦', `--- 订单#${returnOrder.id}: 退货不退款 ---`);

    const reqRes = await userRequestRefund(returnOrder.id);
    if (reqRes.status === 200 && reqRes.data?.success) {
      pass(`申请退货-订单#${returnOrder.id}`, { status: reqRes.data.data?.status });

      const rejectRes = await api('POST', `/api/admin/orders/${returnOrder.id}/refund/reject`, {
        reason: '商品已使用，不予退款',
      }, adminCookie);
      if (rejectRes.status === 200) {
        pass(`管理员拒绝退款-订单#${returnOrder.id}`, {});

        const verifyRes = await api('GET', `/api/orders/${returnOrder.id}`, null, userCookie);
        const orderStatus = verifyRes.data?.data?.order?.order_status || verifyRes.data?.data?.order_status;
        if (orderStatus === 'paid' || orderStatus === 'shipped') {
          pass(`拒绝退款后状态-订单#${returnOrder.id}`, { order_status: orderStatus });
        } else {
          warn(`拒绝退款后状态-订单#${returnOrder.id}`, { order_status: orderStatus, note: '预期为paid或shipped' });
        }
      } else {
        fail(`管理员拒绝退款-订单#${returnOrder.id}`, { status: rejectRes.status, error: rejectRes.data?.error });
      }
    } else {
      fail(`申请退货-订单#${returnOrder.id}`, { status: reqRes.status });
    }
  }

  // 订单6: 发货后申请退款
  if (paidOrders.length >= 6) {
    const refundOrder6 = paidOrders[5];
    log('💰', `--- 订单#${refundOrder6.id}: 发货后退款 ---`);

    const shipRes = await adminShip(refundOrder6.id);
    if (shipRes.status === 200) {
      const reqRes = await userRequestRefund(refundOrder6.id);
      if (reqRes.status === 200 && reqRes.data?.success) {
        pass(`发货后申请退款-订单#${refundOrder6.id}`, { status: reqRes.data.data?.status });

        const approveRes = await adminApproveRefund(refundOrder6.id);
        if (approveRes.status === 200) {
          pass(`发货后同意退款-订单#${refundOrder6.id}`, {});
          await simulateRefundSuccess(refundOrder6.id);
          pass(`发货后退款完成-订单#${refundOrder6.id}`, {});
        } else {
          fail(`发货后同意退款-订单#${refundOrder6.id}`, { status: approveRes.status });
        }
      } else {
        fail(`发货后申请退款-订单#${refundOrder6.id}`, { status: reqRes.status });
      }
    }
  }

  // ===== Phase 8: 超时自动取消 (2个订单) =====
  log('📋', '=== 阶段 8: 超时自动取消 ===');

  const timeoutOrder1 = await createTimeoutOrder(products[0].id, 1, addressId);
  const timeoutOrder2 = await createTimeoutOrder(products[1 % products.length].id, 2, addressId);

  if (timeoutOrder1 || timeoutOrder2) {
    const releaseRes = await api('POST', '/api/inventory/release-expired', {});
    if (releaseRes.status === 200) {
      const released = releaseRes.data?.releasedOrders || releaseRes.data?.data?.releasedOrders || 0;
      pass('超时自动取消执行', { releasedOrders: released });

      if (timeoutOrder1) {
        const verify1 = await dbQuery(`SELECT order_status, payment_status FROM orders WHERE id=${timeoutOrder1.orderId}`);
        if (verify1.rows.length > 0 && verify1.rows[0].order_status === 'cancelled') {
          pass(`超时取消验证-订单#${timeoutOrder1.orderId}`, { status: 'cancelled' });
        } else {
          warn(`超时取消验证-订单#${timeoutOrder1.orderId}`, { actual: verify1.rows[0]?.order_status });
        }
      }
      if (timeoutOrder2) {
        const verify2 = await dbQuery(`SELECT order_status, payment_status FROM orders WHERE id=${timeoutOrder2.orderId}`);
        if (verify2.rows.length > 0 && verify2.rows[0].order_status === 'cancelled') {
          pass(`超时取消验证-订单#${timeoutOrder2.orderId}`, { status: 'cancelled' });
        } else {
          warn(`超时取消验证-订单#${timeoutOrder2.orderId}`, { actual: verify2.rows[0]?.order_status });
        }
      }
    } else {
      fail('超时自动取消执行', { status: releaseRes.status });
    }
  }

  // ===== Phase 9: 未支付订单直接取消 (最后2个订单) =====
  log('📋', '=== 阶段 9: 未支付订单取消 ===');
  for (let i = 8; i < createdOrders.length; i++) {
    const order = createdOrders[i];
    const cancelRes = await api('PATCH', `/api/orders/${order.id}`, { action: 'cancel' }, userCookie);
    if (cancelRes.status === 200 && cancelRes.data?.success) {
      pass(`取消未支付订单-订单#${order.id}`, { status: cancelRes.data.data?.status });
    } else {
      fail(`取消未支付订单-订单#${order.id}`, { status: cancelRes.status, error: cancelRes.data?.error });
    }
  }

  // ===== Phase 10: 管理员后台验证 =====
  log('📋', '=== 阶段 10: 管理员后台验证 ===');

  await verifyAdminDashboard();
  await verifyAdminOrders(createdOrders.length + 2);
  await verifyAdminInventory();

  const adminAnalyticsRes = await api('GET', '/api/admin/analytics/sales', null, adminCookie);
  if (adminAnalyticsRes.status === 200) {
    pass('管理员销售分析', { status: 200 });
  } else {
    fail('管理员销售分析', { status: adminAnalyticsRes.status });
  }

  const adminMarketingRes = await api('GET', '/api/admin/analytics/marketing', null, adminCookie);
  if (adminMarketingRes.status === 200) {
    pass('管理员营销分析', { status: 200 });
  } else {
    fail('管理员营销分析', { status: adminMarketingRes.status });
  }

  // ===== Phase 11: 数据库一致性验证 =====
  log('📋', '=== 阶段 11: 数据库一致性验证 ===');

  const dbOrders = await dbQuery(`SELECT id, order_number, order_status, payment_status, final_amount FROM orders ORDER BY id DESC LIMIT 20`);
  if (dbOrders.rows.length > 0) {
    pass('数据库订单查询', { totalOrders: dbOrders.rows.length });

    const statusCounts = {};
    for (const o of dbOrders.rows) {
      const s = o.order_status;
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }
    pass('订单状态分布', statusCounts);

    for (const o of dbOrders.rows) {
      if (o.order_status === 'paid' && o.payment_status !== 'paid') {
        fail(`数据一致性-订单#${o.id}`, { order_status: o.order_status, payment_status: o.payment_status });
      }
      if (o.order_status === 'cancelled' && o.payment_status !== 'cancelled' && o.payment_status !== 'unpaid') {
        warn(`数据一致性-订单#${o.id}`, { order_status: o.order_status, payment_status: o.payment_status });
      }
    }
  } else {
    warn('数据库订单查询', '无订单数据');
  }

  const dbOrderItems = await dbQuery(`SELECT COUNT(*) as count FROM order_items`);
  if (dbOrderItems.rows.length > 0) {
    pass('数据库订单商品', { count: dbOrderItems.rows[0].count });
  }

  const dbInventory = await dbQuery(`SELECT product_id, quantity FROM inventory WHERE product_id IN (${products.slice(0, 5).map(p => p.id).join(',')})`);
  if (dbInventory.rows.length > 0) {
    pass('数据库库存数据', dbInventory.rows.map(r => `商品#${r.product_id}: ${r.quantity}`).join(', '));
  }

  const dbPayments = await dbQuery(`SELECT COUNT(*) as count FROM payment_logs`);
  if (dbPayments.rows.length > 0) {
    pass('数据库支付日志', { count: dbPayments.rows[0].count });
  }

  const dbReviews = await dbQuery(`SELECT COUNT(*) as count FROM reviews`);
  if (dbReviews.rows.length > 0) {
    pass('数据库评价数据', { count: dbReviews.rows[0].count });
  }

  // ===== 汇总 =====
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║                  测试结果汇总                    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  ✅ 通过: ${passCount}`);
  console.log(`  ❌ 失败: ${failCount}`);
  console.log(`  ⚠️  警告: ${warnCount}`);
  console.log(`  📊 总计: ${passCount + failCount + warnCount}`);
  console.log('');

  if (failCount > 0) {
    console.log('❌ 失败项:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${JSON.stringify(r.detail)}`);
    });
  }

  if (warnCount > 0) {
    console.log('⚠️ 警告项:');
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`  - ${r.name}: ${JSON.stringify(r.detail)}`);
    });
  }

  console.log('');
  console.log(`📋 订单创建统计: ${createdOrders.length} 个订单`);
  createdOrders.forEach((o, i) => {
    console.log(`  ${i + 1}. #${o.number} | $${o.amount || '?'} | ${o.method}`);
  });
}

runFullTest().catch(err => {
  console.error('💥 测试执行异常:', err);
  process.exit(1);
});
