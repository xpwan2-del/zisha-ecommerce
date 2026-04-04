import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

async function getLotteryResult() {
  try {
    // 使用中东地区的彩票数据
    // 这里使用模拟的阿联酋彩票开奖结果，实际应用中可以替换为真实的API调用
    // 阿联酋国家彩票开奖结果示例
    const emiratesLotteryResults = [
      "13,17,3,31,18,6,11", // 第四次阿联酋彩票开奖结果
      "5,9,12,23,29,36,41",
      "2,8,15,21,27,33,40",
      "7,14,19,26,32,38,45",
      "4,11,16,24,30,37,43"
    ];
    
    // 随机选择一个开奖结果
    const randomIndex = Math.floor(Math.random() * emiratesLotteryResults.length);
    const lotteryResult = emiratesLotteryResults[randomIndex];
    
    console.log('使用中东地区彩票开奖结果:', lotteryResult);
    return lotteryResult;
  } catch (error) {
    console.error('获取中东地区彩票开奖结果失败:', error);
    return null;
  }
}

function generateWinningNumberFromLottery(lotteryResult: string, totalEquity: number): number {
  // 使用彩票开奖结果生成中奖号码
  const crypto = require('crypto');
  
  // 将彩票开奖结果转换为数字
  const lotteryNumbers = lotteryResult.split(',').map(num => parseInt(num.trim()));
  
  // 计算所有号码的总和
  const sum = lotteryNumbers.reduce((acc, num) => acc + num, 0);
  
  // 使用总和和时间戳生成哈希
  const timestamp = Date.now();
  const dataString = `${sum}-${timestamp}`;
  const hash = crypto.createHash('sha256').update(dataString).digest('hex');
  
  // 将哈希值转换为数字
  const hashNumber = parseInt(hash.substring(0, 8), 16);
  
  // 使用哈希数字生成中奖号码（1到totalEquity之间）
  const winningNumber = (hashNumber % totalEquity) + 1;
  
  return winningNumber;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const luckyDrawId = searchParams.get('luckyDrawId');
    const userId = searchParams.get('userId');

    let queryText = 'SELECT * FROM lucky_draw_orders';
    const params: any[] = [];
    const conditions: string[] = [];

    if (id) {
      conditions.push('id = ?');
      params.push(id);
    }

    if (luckyDrawId) {
      conditions.push('lucky_draw_id = ?');
      params.push(luckyDrawId);
    }

    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching lucky draw orders:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { luckyDrawId, userId, equityCount, totalAmount } = data;

    if (!luckyDrawId || !userId || !equityCount || !totalAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 开始事务
    await query('BEGIN');

    try {
      // 获取当前已售等份
      const drawResult = await query('SELECT current_equity, total_equity FROM lucky_draws WHERE id = ?', [luckyDrawId]);
      if (drawResult.rows.length === 0) {
        throw new Error('Lucky draw not found');
      }

      const current_equity = Number(drawResult.rows[0].current_equity) || 0;
      const total_equity = Number(drawResult.rows[0].total_equity) || 0;
      const newCurrentEquity = current_equity + equityCount;

      if (newCurrentEquity > total_equity) {
        throw new Error('Insufficient equity');
      }

      // 生成等份号码
      const equityNumbers = [];
      for (let i = current_equity + 1; i <= newCurrentEquity; i++) {
        equityNumbers.push(i);
      }

      // 更新一元购活动的当前已售等份
      await query('UPDATE lucky_draws SET current_equity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newCurrentEquity, luckyDrawId]);

      // 创建订单
      const orderResult = await query(
        `INSERT INTO lucky_draw_orders (lucky_draw_id, user_id, equity_count, total_amount, equity_numbers)
         VALUES (?, ?, ?, ?, ?) RETURNING *`,
        [luckyDrawId, userId, equityCount, totalAmount, equityNumbers.join(',')]
      );

      // 检查是否所有等份都已售出
      if (newCurrentEquity === total_equity) {
        // 获取彩票开奖结果
        const lotteryResult = await getLotteryResult();
        
        if (lotteryResult) {
          // 使用彩票开奖结果生成中奖号码
          const winningNumber = generateWinningNumberFromLottery(lotteryResult, total_equity);
          
          // 查找中奖用户
          const winningOrderResult = await query(
            'SELECT user_id FROM lucky_draw_orders WHERE lucky_draw_id = ? AND equity_numbers LIKE ?',
            [luckyDrawId, `%${winningNumber}%`]
          );

          if (winningOrderResult.rows.length > 0) {
            const winnerId = winningOrderResult.rows[0].user_id;
            
            // 更新一元购活动状态和中奖信息
            await query(
              'UPDATE lucky_draws SET status = ?, winner_id = ?, winning_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              ['completed', winnerId, luckyDrawId]
            );
          }
        } else {
          // 如果无法获取彩票开奖结果，使用备用算法
          const allOrdersResult = await query(
            'SELECT id, user_id, created_at FROM lucky_draw_orders WHERE lucky_draw_id = ? ORDER BY created_at',
            [luckyDrawId]
          );

          if (allOrdersResult.rows.length > 0) {
            const crypto = require('crypto');
            const dataString = allOrdersResult.rows.map(order => `${order.id}-${order.created_at}`).join('|');
            const hash = crypto.createHash('sha256').update(dataString).digest('hex');
            const hashNumber = parseInt(hash.substring(0, 8), 16);
            const winningNumber = (hashNumber % total_equity) + 1;
            
            const winningOrderResult = await query(
              'SELECT user_id FROM lucky_draw_orders WHERE lucky_draw_id = ? AND equity_numbers LIKE ?',
              [luckyDrawId, `%${winningNumber}%`]
            );

            if (winningOrderResult.rows.length > 0) {
              const winnerId = winningOrderResult.rows[0].user_id;
              
              await query(
                'UPDATE lucky_draws SET status = ?, winner_id = ?, winning_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['completed', winnerId, luckyDrawId]
              );
            }
          }
        }
      }

      // 提交事务
      await query('COMMIT');
      return NextResponse.json(orderResult.rows[0], { status: 201 });
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating lucky draw order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await query('DELETE FROM lucky_draw_orders WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Lucky draw order deleted successfully' });
  } catch (error) {
    console.error('Error deleting lucky draw order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}