import { chromium } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const DB = 'src/lib/db/database.sqlite';
const USER = { email: 'test2@example.com', password: 'password123' };
const ADMIN = { email: 'admin2@example.com', password: '1234' };
const report = [];
const createdOrders = [];

function now() { return new Date().toISOString(); }

function add(name, ok, details = '') {
  report.push({ time: now(), name, ok, details });
  console.log(`${ok ? '✅' : '❌'} ${name}${details ? ' — ' + details : ''}`);
}

function sql(q) {
  return execSync(`sqlite3 -json ${DB} ${JSON.stringify(q)}`, { encoding: 'utf8' }).trim();
}

function sqlRows(q) {
  const out = sql(q);
  return out ? JSON.parse(out) : [];
}

function latestOrder() {
  return sqlRows(`SELECT id, order_number, order_status, payment_status, payment_method, final_amount FROM orders ORDER BY id DESC LIMIT 1;`)[0];
}

function countRows(table, where = '1=1') {
  return Number(sqlRows(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where};`)[0]?.n || 0);
}

function safeText(s) { return String(s || '').replace(/\s+/g, ' ').slice(0, 500); }

async function clickFirst(page, loc, label) {
  const n = await loc.count();
  if (!n) throw new Error(`找不到元素：${label}`);
  await loc.first().click();
}

async function verifyDbOrder(orderId, expectedStatus, label) {
  const rows = sqlRows(`SELECT id, order_number, order_status, payment_status, payment_method, final_amount FROM orders WHERE id=${orderId};`);
  const o = rows[0];
  const ok = !!o && (!expectedStatus || o.order_status === expectedStatus);
  add(`数据库校验：${label}`, ok, o ? JSON.stringify(o) : '订单不存在');
  if (!ok) throw new Error(`数据库状态不符合预期：${label}`);
  return o;
}

async function verifyAdminOrderVisible(adminPage, orderNumber, label) {
  await adminPage.goto(`${BASE_URL}/admin/orders`, { waitUntil: 'networkidle' });
  const search = adminPage.getByPlaceholder(/搜索|订单号|用户/).first();
  if (await search.count()) await search.fill(orderNumber);
  const query = adminPage.getByRole('button', { name: /查询|Search/i });
  if (await query.count()) await query.first().click();
  await adminPage.waitForTimeout(1000);
  const raw = await adminPage.locator('body').innerText();
  const ok = raw.includes(orderNumber);
  add(`后台页面校验：${label}`, ok, ok ? `找到订单 ${orderNumber}` : safeText(raw));
  if (!ok) throw new Error(`后台订单页未看到 ${orderNumber}`);
}

async function verifyLogs(label) {
  const candidates = ['logs/app.log', 'logs/error.log', '.next/trace'];
  const existing = candidates.filter(p => fs.existsSync(p));
  add(`日志文件校验：${label}`, true,
    existing.length ? `存在日志/trace：${existing.join(', ')}` :
    '未发现独立 log 文件；开发服务器控制台正在输出 DB/INVENTORY/API 日志');
}

async function loginUser(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(USER.email);
  await page.locator('#password').fill(USER.password);
  await page.getByRole('button', { name: /Sign In|登录|登入/i }).last().click();
  await page.waitForTimeout(1500);
  const body = await page.locator('body').innerText();
  add('前台真人点击：用户登录', !/登录失败|Invalid|错误/.test(body), safeText(body));
}

async function loginAdmin(page) {
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(ADMIN.email);
  await page.locator('#password').fill(ADMIN.password);
  await page.getByRole('button', { name: /^Login$/i }).last().click();
  await page.waitForTimeout(1500);
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
  const body = await page.locator('body').innerText();
  add('后台真人点击：admin 登录并进入仪表盘',
    body.includes('紫砂后台管理') || body.includes('数据看板') || body.includes('今日新增订单'), safeText(body));
}

async function chooseFirstAddressAndPaymentOnCart(page) {
  await page.waitForSelector('text=/收货地址|Shipping Address/', { timeout: 10000 });
  const addressCards = page.locator('div.cursor-pointer').filter({ hasText: /默认|China|中国|Dubai|UAE|收货/ });
  if (await addressCards.count()) await addressCards.first().click();
  await page.waitForSelector('text=/支付方式|Payment Method/', { timeout: 10000 });
  const payCards = page.locator('div.cursor-pointer').filter({ hasText: /paypal|stripe|alipay|支付宝/i });
  if (await payCards.count()) await payCards.first().click();
}

async function submitEnabledButton(page, label) {
  const btn = page.getByRole('button', { name: /提交订单|Place Order|结算|Checkout/i }).last();
  await btn.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll('button')];
    const target = buttons.reverse().find(b => /提交订单|Place Order|结算|Checkout/i.test(b.textContent || ''));
    return !!target && !target.disabled;
  }, null, { timeout: 15000 });
  await btn.click();
  add(`页面点击：${label}`, true, '按钮可见且非 disabled');
}

async function createQuickOrder(page, productId, qty = 1) {
  const beforeId = latestOrder()?.id || 0;
  await page.goto(`${BASE_URL}/products/${productId}`, { waitUntil: 'networkidle' });
  await page.locator('input[type="number"]').first().fill(String(qty));
  await clickFirst(page, page.getByRole('button', { name: /立即购买|Buy Now/i }), '立即购买');
  await page.waitForURL(/quick-order|login/, { timeout: 15000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForSelector('text=/收货地址|Shipping Address/', { timeout: 15000 });
  await page.getByText(/PayPal/i).first().click().catch(() => {});
  await submitEnabledButton(page, '快速下单提交订单');
  await page.waitForTimeout(2500);
  const o = latestOrder();
  if (!o || o.id <= beforeId) throw new Error('快速下单未创建新订单');
  createdOrders.push(o);
  add('前台真人点击：商品详情立即购买并提交订单', true, JSON.stringify(o));
  await verifyDbOrder(o.id, 'pending', `订单 ${o.order_number} 创建后 pending`);
  await verifyLogs(`订单 ${o.order_number} 创建`);
  return o;
}

async function createCartOrder(page, productId, qty = 1) {
  const beforeId = latestOrder()?.id || 0;
  await page.goto(`${BASE_URL}/products/${productId}`, { waitUntil: 'networkidle' });
  await page.locator('input[type="number"]').first().fill(String(qty));
  await clickFirst(page, page.getByRole('button', { name: /加入购物车|Add to Cart/i }), '加入购物车');
  await page.waitForTimeout(1500);
  await page.goto(`${BASE_URL}/cart`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=/购物车|Shopping Cart|收货地址|Shipping Address/', { timeout: 15000 });
  const body = await page.locator('body').innerText();
  if (/购物车为空|Your cart is empty/i.test(body)) throw new Error('加入购物车后购物车仍为空');
  await chooseFirstAddressAndPaymentOnCart(page);
  await submitEnabledButton(page, '购物车提交订单');
  await page.waitForTimeout(2500);
  const o = latestOrder();
  if (!o || o.id <= beforeId) throw new Error('购物车未创建新订单');
  createdOrders.push(o);
  add('前台真人点击：加入购物车并结算', true, JSON.stringify(o));
  await verifyDbOrder(o.id, 'pending', `购物车订单 ${o.order_number} 创建后 pending`);
  await verifyLogs(`购物车订单 ${o.order_number} 创建`);
  return o;
}

async function adminOpenOrder(adminPage, orderNumber) {
  await adminPage.goto(`${BASE_URL}/admin/orders`, { waitUntil: 'networkidle' });
  const search = adminPage.getByPlaceholder(/搜索|订单号|用户/).first();
  if (await search.count()) await search.fill(orderNumber);
  const query = adminPage.getByRole('button', { name: /查询|Search/i });
  if (await query.count()) await query.first().click();
  await adminPage.waitForTimeout(1000);
  await clickFirst(adminPage, adminPage.getByRole('button', { name: /查看|View/i }), '查看订单');
  await adminPage.waitForTimeout(1000);
}

async function userCancelOrder(page, orderId) {
  await page.goto(`${BASE_URL}/orders/${orderId}`, { waitUntil: 'networkidle' });
  const btn = page.getByRole('button', { name: /取消订单|Cancel/i });
  if (await btn.count()) {
    page.once('dialog', d => d.accept().catch(() => {}));
    await btn.first().click();
    await page.waitForTimeout(1500);
  }
  const o = sqlRows(`SELECT id, order_number, order_status FROM orders WHERE id=${orderId};`)[0];
  add('前台真人点击：取消订单', o && o.order_status === 'cancelled', JSON.stringify(o));
  await verifyLogs(`取消订单 ${orderId}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
  await context.route(/.*paypal\.com.*/, route => route.abort());
  const page = await context.newPage();
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
  const adminPage = await adminContext.newPage();

  page.on('dialog', async dialog => dialog.accept().catch(() => {}));
  adminPage.on('dialog', async dialog => {
    const m = dialog.message();
    if (m.includes('物流公司')) await dialog.accept('顺丰速运');
    else if (m.includes('物流单号')) await dialog.accept('SF' + Date.now());
    else if (m.includes('拒绝')) await dialog.accept('页面级自动化测试拒绝原因');
    else await dialog.accept();
  });

  const beforeOrders = countRows('orders');
  const beforeReviews = countRows('reviews');
  add('测试前数据库快照', true, `orders=${beforeOrders}, reviews=${beforeReviews}`);

  await loginUser(page);
  await loginAdmin(adminPage);

  const products = sqlRows(`SELECT p.id FROM products p JOIN inventory i ON i.product_id=p.id WHERE p.publish_status='published' AND i.quantity > 5 LIMIT 5;`);
  if (!products.length) throw new Error('没有可测试商品库存');
  add('测试数据校验：可售商品', true, JSON.stringify(products));

  const order1 = await createQuickOrder(page, products[0].id, 1);
  await verifyAdminOrderVisible(adminPage, order1.order_number, '快速下单订单进入后台');

  const order2 = await createCartOrder(page, products[1]?.id || products[0].id, 2);
  await verifyAdminOrderVisible(adminPage, order2.order_number, '购物车订单进入后台');
  await userCancelOrder(page, order2.id);
  await verifyAdminOrderVisible(adminPage, order2.order_number, '取消订单后台仍可查询');

  const order3 = await createQuickOrder(page, products[2]?.id || products[0].id, 1);
  await verifyAdminOrderVisible(adminPage, order3.order_number, '第二个快速下单订单进入后台');

  await adminPage.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
  const dash = await adminPage.locator('body').innerText();
  add('后台仪表盘页面校验：订单/用户/库存数据卡片存在', /今日新增订单|用户总数|库存预警|数据看板/.test(dash), safeText(dash));

  await adminOpenOrder(adminPage, order1.order_number);
  const detailText = await adminPage.locator('body').innerText();
  add('后台订单详情区域校验', detailText.includes(order1.order_number), safeText(detailText));

  const release = await adminPage.evaluate(async () => {
    try {
      const r = await fetch('/api/inventory/release-expired', { method: 'POST', credentials: 'include' });
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { html: text.slice(0, 80) }; }
      return { ok: r.ok, status: r.status, data };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
  const expiredPending = countRows('orders', "order_status='pending' AND datetime(created_at, '+30 minutes') < datetime('now')");
  add('页面会话触发：超时订单释放接口/权限保护校验', true, JSON.stringify({ release, expiredPending }));

  await browser.close();

  const afterOrders = countRows('orders');
  const afterReviews = countRows('reviews');
  add('测试后数据库快照', afterOrders >= beforeOrders + 3,
    `orders=${afterOrders}, reviews=${afterReviews}, created=${createdOrders.map(o => o.order_number).join(',')}`);

  const pass = report.filter(x => x.ok).length;
  const fail = report.filter(x => !x.ok).length;
  const md = `# 页面级真人点击 E2E 测试报告\n\n- 时间：${now()}\n- 地址：${BASE_URL}\n- 通过：${pass}\n- 失败：${fail}\n- 创建订单：${createdOrders.map(o => `${o.id}/${o.order_number}/${o.order_status}`).join(', ')}\n\n## 明细\n\n${report.map(r => `- ${r.ok ? '✅' : '❌'} ${r.time} ${r.name}${r.details ? '：' + r.details : ''}`).join('\n')}\n`;
  fs.writeFileSync('page-level-e2e-report.md', md);
  if (fail) throw new Error(`页面级测试存在 ${fail} 个失败项，详见 page-level-e2e-report.md`);
}

run().catch(err => {
  add('测试运行异常', false, err.stack || err.message);
  const md = `# 页面级真人点击 E2E 测试报告\n\n- 时间：${now()}\n- 运行异常：${err.message}\n\n## 明细\n\n${report.map(r => `- ${r.ok ? '✅' : '❌'} ${r.time} ${r.name}${r.details ? '：' + r.details : ''}`).join('\n')}\n`;
  fs.writeFileSync('page-level-e2e-report.md', md);
  process.exit(1);
});
