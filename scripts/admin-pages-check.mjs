import fetch from 'node-fetch';

const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const adminEmail = process.env.ADMIN_CHECK_EMAIL || 'admin2@example.com';
const adminPassword = process.env.ADMIN_CHECK_PASSWORD || '1234';

async function runRealCheck() {
  console.log(`\n🚀 开始后台页面真实点验 (BaseURL: ${baseURL})\n`);

  let authCookie = '';

  console.log('--- [Step 1] 管理员身份授权 ---');
  try {
    const loginRes = await fetch(`${baseURL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });

    if (!loginRes.ok) {
      const errorText = await loginRes.text();
      console.error(`登录失败 [${loginRes.status}]: ${errorText}`);
      console.log('提示：请确保开发服务器已启动且管理员账号存在');
      process.exit(1);
    }

    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) {
      authCookie = setCookie.split(';')[0];
      console.log('授权成功，已获取 access_token');
    } else {
      console.warn('登录成功但未发现 set-cookie 响应头');
    }
  } catch (err) {
    console.error(`登录请求异常: ${err.message}`);
    process.exit(1);
  }

  const headers = {
    Cookie: authCookie,
    'Content-Type': 'application/json'
  };

  const checkResults = [];

  console.log('\n--- [Step 2] 页面可达性点验 ---');
  const pages = [
    { path: '/admin/dashboard', name: '后台数据看板' },
    { path: '/admin/products', name: '商品运营中心' },
    { path: '/admin/coupons', name: '优惠券管理' },
    { path: '/admin/payments', name: '支付中心主页' },
    { path: '/admin/payments/orders', name: '支付订单流水' },
    { path: '/admin/payments/logs', name: '支付回调日志' },
    { path: '/admin/payments/refunds', name: '退款流水视图' },
    { path: '/admin/inventory', name: '库存中心' },
    { path: '/admin/inventory/alerts', name: '库存预警' },
    { path: '/admin/inventory/checks', name: '库存盘点' },
    { path: '/admin/settings/exchange-rates', name: '汇率设置' },
    { path: '/admin/settings/audit-logs', name: '审计日志' },
    { path: '/admin/settings/general', name: '系统配置' }
  ];

  for (const page of pages) {
    try {
      const res = await fetch(`${baseURL}${page.path}`, { headers, redirect: 'manual' });
      const isOk = [200, 302, 307, 308].includes(res.status);
      console.log(`${isOk ? '✅' : '❌'} [${res.status}] ${page.name}: ${page.path}`);
      checkResults.push({ name: page.name, success: isOk });
    } catch (err) {
      console.log(`❌ ${page.name} (${page.path}) 请求失败: ${err.message}`);
      checkResults.push({ name: page.name, success: false });
    }
  }

  console.log('\n--- [Step 3] API 数据结构点验 ---');
  const apis = [
    {
      path: '/api/admin/dashboard',
      name: '后台数据看板接口',
      validate: (data) => data.success === true && data.data?.todayOrders && Array.isArray(data.data?.recentOrders)
    },
    {
      path: '/api/admin/coupons',
      name: '优惠券管理接口',
      validate: (data) => data.success === true && Array.isArray(data.data?.coupons)
    },
    {
      path: '/api/admin/settings/exchange-rates',
      name: '汇率设置接口',
      validate: (data) => data.success === true && Array.isArray(data.data)
    },
    {
      path: '/api/admin/settings/audit-logs',
      name: '审计日志接口',
      validate: (data) => data.success === true && Array.isArray(data.data?.logs)
    },
    {
      path: '/api/admin/settings/general',
      name: '系统配置接口',
      validate: (data) => data.success === true && typeof data.data === 'object'
    },
    {
      path: '/api/admin/users',
      name: '后台用户管理接口',
      validate: (data) => data.success === true && Array.isArray(data.data?.users)
    },
    {
      path: '/api/admin/payments/orders',
      name: '支付订单流水接口',
      validate: (data) => data.success === true && Array.isArray(data.data?.orders)
    },
    {
      path: '/api/admin/payments/logs',
      name: '支付回调日志接口',
      validate: (data) => data.success === true && Array.isArray(data.data?.logs) && (data.data.logs.length === 0 || 'type' in data.data.logs[0])
    },
    {
      path: '/api/admin/payments/refunds',
      name: '退款流水接口',
      validate: (data) => data.success === true && Array.isArray(data.data?.refunds)
    },
    {
      path: '/api/admin/payments/retry',
      method: 'POST',
      body: { order_number: 'NON-EXISTENT-ORDER' },
      name: '支付重试接口',
      validate: (_data, status) => status === 404
    }
  ];

  for (const api of apis) {
    try {
      const options = {
        method: api.method || 'GET',
        headers
      };
      if (api.body) options.body = JSON.stringify(api.body);

      const res = await fetch(`${baseURL}${api.path}`, options);
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      const isOk = api.validate ? api.validate(data, res.status) : res.status === 200;
      console.log(`${isOk ? '✅' : '❌'} [${res.status}] ${api.name}: ${api.path}`);
      if (!isOk) {
        console.log(`   响应片段: ${text.slice(0, 160)}`);
      }
      checkResults.push({ name: api.name, success: isOk });
    } catch (err) {
      console.log(`❌ ${api.name} (${api.path}) 请求失败: ${err.message}`);
      checkResults.push({ name: api.name, success: false });
    }
  }

  const failed = checkResults.filter(r => !r.success);
  console.log(`\n📊 点验完成: ${checkResults.length - failed.length}/${checkResults.length} 通过`);

  if (failed.length > 0) {
    console.error('\n❌ 以下项目点验失败，请检查服务状态或代码逻辑！');
    process.exit(1);
  }

  console.log('\n✨ 所有真实点验项已成功通过！\n');
}

await runRealCheck();

