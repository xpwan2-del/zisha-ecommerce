const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

async function createLuckyDrawOrder(luckyDrawId, userId, equityCount) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      luckyDrawId,
      userId,
      equityCount,
      totalAmount: equityCount
    });

    const req = http.request({
      ...options,
      path: '/api/lucky-draw-orders',
      method: 'POST'
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          console.log(`用户 ${userId} 购买了 ${equityCount} 份，获得等份号码: ${result.equity_numbers}`);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testLuckyDraw() {
  const luckyDrawId = 1;
  const totalEquity = 100;
  let currentEquity = 10; // 已经售出了10份

  console.log('开始测试一元购抽奖系统...');
  console.log(`活动ID: ${luckyDrawId}, 总等份: ${totalEquity}, 已售出: ${currentEquity}`);

  // 模拟多个用户购买等份
  let userId = 3;
  while (currentEquity < totalEquity) {
    const equityCount = Math.min(10, totalEquity - currentEquity); // 每次最多购买10份
    await createLuckyDrawOrder(luckyDrawId, userId, equityCount);
    currentEquity += equityCount;
    userId++;
    await new Promise(resolve => setTimeout(resolve, 100)); // 稍微延迟，避免请求过快
  }

  console.log('所有等份已售出，等待开奖...');
  
  // 等待几秒钟，让系统完成开奖
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 检查活动状态
  const checkResult = await new Promise((resolve, reject) => {
    const req = http.request({
      ...options,
      path: `/api/lucky-draws?id=${luckyDrawId}`,
      method: 'GET'
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });

  console.log('活动状态:', JSON.stringify(checkResult, null, 2));
}

testLuckyDraw().catch(console.error);