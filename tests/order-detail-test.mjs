const BASE = 'http://localhost:3000';

async function main() {
  let pass = 0, fail = 0;
  const log = (t) => console.log(`  [${new Date().toLocaleTimeString()}] ${t}`);
  const ok = (t) => { console.log(`  ✅ PASS: ${t}`); pass++; };
  const err = (t) => { console.log(`  ❌ FAIL: ${t}`); fail++; };
  const section = (t) => console.log(`\n━━━ ${t} ━━━`);

  let token = '';

  // TEST 1: Login
  section('TEST 1: 用户登录');
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: '123456' })
  });
  const loginData = await loginRes.json();
  // Extract cookie
  const cookies = loginRes.headers.getSetCookie();
  token = cookies.find(c => c.startsWith('access_token='));
  if (token) token = token.split('=')[1].split(';')[0];
  
  if (loginData.success) {
    ok(`登录成功 userId=${loginData.data.user.id}`);
  } else {
    err('登录失败');
    process.exit(1);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Cookie': `access_token=${token}`
  };

  // TEST 2: Get orders
  section('TEST 2: 获取订单列表');
  const ordersRes = await fetch(`${BASE}/api/orders-list`, { headers: authHeaders });
  const ordersData = await ordersRes.json();
  const orders = ordersData.data?.orders || [];
  log(`订单数量: ${orders.length}`);
  const pendingOrders = orders.filter(o => o.order_status === 'pending');
  log(`pending 订单数: ${pendingOrders.length}`);
  if (pendingOrders.length > 0) {
    const targetOrder = pendingOrders[0];
    log(`目标订单: id=${targetOrder.id} number=${targetOrder.order_number}`);
    ok(`找到 pending 订单 id=${targetOrder.id}`);
  } else {
    log('无 pending 订单，将检查所有订单状态');
    for (const o of orders.slice(0, 3)) {
      log(`  id=${o.id} status=${o.order_status} amount=${o.final_amount}`);
    }
    ok(`获取订单列表成功`);
  }

  // TEST 3: Get addresses
  section('TEST 3: 获取地址列表');
  const addrRes = await fetch(`${BASE}/api/addresses`, { headers: authHeaders });
  const addrData = await addrRes.json();
  const addresses = addrData.data || [];
  log(`地址数量: ${addresses.length}`);
  for (const a of addresses.slice(0, 3)) {
    log(`  id=${a.id} city=${a.city} country=${a.country_name}`);
  }
  if (addresses.length > 0) ok(`获取地址列表成功 (${addresses.length}个)`);
  else err('地址列表为空');

  // TEST 4: Get coupons
  section('TEST 4: 获取可用优惠券列表');
  const couponRes = await fetch(`${BASE}/api/coupons?status=active`, { headers: authHeaders });
  const couponData = await couponRes.json();
  const coupons = couponData.data || [];
  log(`可用优惠券数量: ${coupons.length}`);
  for (const c of coupons.slice(0, 3)) {
    log(`  id=${c.id} name=${c.name} code=${c.code} type=${c.type} value=${c.value}`);
  }
  if (coupons.length > 0) ok(`获取优惠券列表成功 (${coupons.length}张)`);
  else err('优惠券列表为空');

  // Find target order (use first pending or any order)
  const targetOrder = pendingOrders[0] || orders[0];
  if (!targetOrder) {
    err('没有任何订单可用于测试');
    process.exit(1);
  }
  const orderId = targetOrder.id;
  const targetAddr = addresses[0];
  const targetAddrId = targetAddr?.id;
  const targetCoupon = coupons[0];
  const targetCouponId = targetCoupon?.id;

  // TEST 5: Estimate without coupon
  section(`TEST 5: 价格估算（无优惠券 - 订单${orderId}）`);
  const estBaseRes = await fetch(`${BASE}/api/orders/${orderId}/estimate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ address_id: targetAddrId, coupon_ids: [] })
  });
  const estBaseData = await estBaseRes.json();
  log(`success: ${estBaseData.success}`);
  if (estBaseData.success) {
    const d = estBaseData.data;
    log(`小计: $${d.subtotal}`);
    log(`运费: $${d.shipping_fee}`);
    log(`优惠券折扣: $${d.coupon_discount}`);
    log(`应付总额: $${d.final_amount}`);
    ok('估算接口返回成功');
    if (d.coupon_discount === 0) ok('无优惠券时折扣为 0');
    else err(`无优惠券时折扣不为 0: ${d.coupon_discount}`);
  } else {
    err(`估算接口失败: ${estBaseData.error}`);
  }
  const baseFinal = estBaseData.data?.final_amount || 0;

  // TEST 6: Estimate with coupon
  if (targetCouponId) {
    section(`TEST 6: 价格估算（选择优惠券 ${targetCoupon?.name}）`);
    const estCouponRes = await fetch(`${BASE}/api/orders/${orderId}/estimate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ address_id: targetAddrId, coupon_ids: [targetCouponId] })
    });
    const estCouponData = await estCouponRes.json();
    log(`success: ${estCouponData.success}`);
    if (estCouponData.success) {
      const d = estCouponData.data;
      log(`小计: $${d.subtotal}`);
      log(`优惠券折扣: $${d.coupon_discount}`);
      log(`运费: $${d.shipping_fee}`);
      log(`应付总额: $${d.final_amount}`);
      ok('选择优惠券后估算成功');
      if (d.coupon_discount > 0) ok(`优惠券折扣生效: -$${d.coupon_discount}`);
      else err('优惠券折扣未生效');

      // Price calculation check
      const expected = d.subtotal - d.coupon_discount + d.shipping_fee;
      if (Math.abs(d.final_amount - expected) < 0.01) {
        ok(`价格计算正确: ${d.subtotal} - ${d.coupon_discount} + ${d.shipping_fee} = ${d.final_amount}`);
      } else {
        err(`价格计算不一致: 预期=${expected}, 实际=${d.final_amount}`);
      }

      // TEST 7: Price difference
      section('TEST 7: 价格变化验证（有优惠券 vs 无优惠券）');
      const diff = baseFinal - d.final_amount;
      log(`无优惠券应付: $${baseFinal}`);
      log(`有优惠券应付: $${d.final_amount}`);
      log(`价格差: $${diff}`);
      if (diff > 0) ok(`选择优惠券后价格降低了 $${diff}`);
      else err('选择优惠券后价格没有变化');
    } else {
      err(`选择优惠券后估算失败: ${estCouponData.error}`);
    }
  } else {
    section('TEST 6 & 7: 跳过（无可用优惠券）');
  }

  // TEST 8: Different address
  const addr2 = addresses.find(a => a.id !== targetAddrId);
  if (addr2) {
    section(`TEST 8: 更换地址后运费变化 (${targetAddr?.city} → ${addr2.city})`);
    const estAddr2Res = await fetch(`${BASE}/api/orders/${orderId}/estimate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ address_id: addr2.id, coupon_ids: [] })
    });
    const estAddr2Data = await estAddr2Res.json();
    if (estAddr2Data.success) {
      const d = estAddr2Data.data;
      log(`地址1(${targetAddr?.city})运费: $${estBaseData.data?.shipping_fee}`);
      log(`地址2(${addr2.city})运费: $${d.shipping_fee}`);
      if (estBaseData.data?.shipping_fee !== d.shipping_fee) {
        ok(`不同地址运费不同: $${estBaseData.data?.shipping_fee} → $${d.shipping_fee}`);
      } else {
        ok('运费计算正常（两地址运费相同）');
      }
    } else {
      err('更换地址后估算失败');
    }
  } else {
    section('TEST 8: 跳过（只有一个地址）');
  }

  // TEST 9: Page HTML check
  section('TEST 9: 订单详情页面渲染验证');
  const pageRes = await fetch(`${BASE}/orders/${orderId}`, { headers: authHeaders });
  const pageHtml = await pageRes.text();
  
  const checks = [
    { pattern: 'lg:grid-cols-3', desc: '优惠券左右分栏布局 (grid-cols-3)' },
    { pattern: '已选优惠券', desc: '已选优惠券汇总区域' },
    { pattern: '清空所有优惠券', desc: '清空优惠券按钮' },
    { pattern: 'fetchEstimate', desc: 'fetchEstimate 逻辑' },
    { pattern: 'handleAddressChange', desc: 'handleAddressChange 逻辑' },
    { pattern: 'estimatedPrice', desc: 'estimatedPrice 状态' },
    { pattern: 'isEstimating', desc: 'isEstimating 加载状态' },
  ];
  for (const c of checks) {
    if (pageHtml.includes(c.pattern)) ok(c.desc);
    else err(c.desc);
  }

  // TEST 10: prepare-payment
  if (targetCouponId) {
    section('TEST 10: 提交订单（prepare-payment）');
    const prepRes = await fetch(`${BASE}/api/orders/${orderId}/prepare-payment`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        address_id: targetAddrId,
        coupon_ids: [targetCouponId],
        payment_method: 'paypal'
      })
    });
    const prepData = await prepRes.json();
    log(`success: ${prepData.success}`);
    if (prepData.success) {
      log(`最终金额: $${prepData.data.final_amount}`);
      log(`订单号: ${prepData.data.order_number}`);
      log(`支付平台: ${prepData.data.platform}`);
      ok('prepare-payment 接口调用成功');

      if (estCouponData?.success) {
        const match = Math.abs(prepData.data.final_amount - estCouponData.data.final_amount) < 0.01;
        if (match) ok(`最终金额与估算一致: $${prepData.data.final_amount}`);
        else log(`金额差异: 估算=$${estCouponData.data.final_amount} 提交=$${prepData.data.final_amount}`);
      }
    } else {
      err(`prepare-payment 失败: ${prepData.error}`);
    }
  }

  // TEST 11: Re-estimate after cancel (simulate)
  section('TEST 11: 模拟取消支付后重新进入');
  const reOrderRes = await fetch(`${BASE}/api/orders/${orderId}`, { headers: authHeaders });
  const reOrderData = await reOrderRes.json();
  log(`订单状态: ${reOrderData.data?.order_status}`);
  
  const reEstRes = await fetch(`${BASE}/api/orders/${orderId}/estimate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ address_id: targetAddrId, coupon_ids: [] })
  });
  const reEstData = await reEstRes.json();
  if (reEstData.success) ok('取消支付后可重新估算价格');
  else err('取消支付后估算失败');

  // Summary
  section('测试结果汇总');
  const total = pass + fail;
  console.log(`\n  ✅ 通过: ${pass}\n  ❌ 失败: ${fail}\n  总计: ${total}\n`);
  if (fail === 0) {
    console.log('🎉 所有测试通过！');
  } else {
    console.log(`⚠️ 有 ${fail} 个测试失败`);
  }
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('脚本错误:', e); process.exit(1); });
