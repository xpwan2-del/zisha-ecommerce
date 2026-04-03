// 测试脚本：创建新的一元购活动并测试完整流程
const fetch = (await import('node-fetch')).default;

const API_BASE_URL = 'http://localhost:3000/api';

async function createLuckyDraw() {
  try {
    const response = await fetch(`${API_BASE_URL}/lucky-draws`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: 1,
        totalEquity: 100,
        pricePerEquity: 1.00,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7天后
      }),
    });
    
    const data = await response.json();
    console.log('创建活动成功:', data);
    return data;
  } catch (error) {
    console.error('创建活动失败:', error);
    return null;
  }
}

async function purchaseEquity(luckyDrawId, userId, equityCount) {
  try {
    const response = await fetch(`${API_BASE_URL}/lucky-draw-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        luckyDrawId,
        userId,
        equityCount,
        totalAmount: equityCount * 1.00 // 每份1元
      }),
    });
    
    const data = await response.json();
    console.log(`用户 ${userId} 购买了 ${equityCount} 份，获得等份号码: ${data.equity_numbers}`);
    return data;
  } catch (error) {
    console.error('购买等份失败:', error);
    return null;
  }
}

async function getLuckyDrawStatus(luckyDrawId) {
  try {
    const response = await fetch(`${API_BASE_URL}/lucky-draws?id=${luckyDrawId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取活动状态失败:', error);
    return null;
  }
}

async function main() {
  console.log('开始测试一元购抽奖系统...');
  
  // 创建新的活动
  const luckyDraw = await createLuckyDraw();
  if (!luckyDraw) {
    console.error('无法创建活动，测试终止');
    return;
  }
  
  const luckyDrawId = luckyDraw.id;
  console.log(`活动ID: ${luckyDrawId}, 总等份: ${luckyDraw.total_equity}, 已售出: ${luckyDraw.current_equity}`);
  
  // 模拟多个用户购买等份
  const users = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  let remainingEquity = luckyDraw.total_equity;
  
  for (const userId of users) {
    if (remainingEquity <= 0) break;
    
    const equityCount = remainingEquity >= 10 ? 10 : remainingEquity;
    await purchaseEquity(luckyDrawId, userId, equityCount);
    remainingEquity -= equityCount;
  }
  
  console.log('所有等份已售出，等待开奖...');
  
  // 等待一段时间让系统处理开奖
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 检查活动状态
  const status = await getLuckyDrawStatus(luckyDrawId);
  console.log('活动状态:', status);
}

main();