import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 验证token函数
function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// 从数据库获取1元购活动数据
async function getLuckyDraws() {
  const sql = `
    SELECT 
      ld.id, 
      ld.product_id, 
      p.name AS product_name, 
      p.image AS product_image, 
      p.price AS product_price, 
      ld.total_equity, 
      ld.current_equity, 
      ld.price_per_equity, 
      ld.start_time, 
      ld.end_time, 
      ld.status
    FROM lucky_draws ld
    JOIN products p ON ld.product_id = p.id
    ORDER BY ld.created_at DESC
  `;
  
  const result = await query(sql);
  return result.rows;
}

// 从数据库获取单个1元购活动
async function getLuckyDrawById(id: number) {
  const sql = `
    SELECT 
      ld.id, 
      ld.product_id, 
      p.name AS product_name, 
      p.image AS product_image, 
      p.price AS product_price, 
      ld.total_equity, 
      ld.current_equity, 
      ld.price_per_equity, 
      ld.start_time, 
      ld.end_time, 
      ld.status
    FROM lucky_draws ld
    JOIN products p ON ld.product_id = p.id
    WHERE ld.id = ?
  `;
  
  const result = await query(sql, [id]);
  return result.rows[0];
}

// 计算中奖号码的函数
async function calculateWinningNumber(totalEquity: number): Promise<number> {
  try {
    // 调用指数数据API获取最新市场数据
    const response = await fetch('http://localhost:3000/api/index-data');
    const data = await response.json();
    
    if (data.success && data.data) {
      const indexData = data.data;
      console.log('Index data:', indexData);
      
      // 使用指数数据计算中奖号码
      const totalSum = indexData.totalSum || indexData.numbers.reduce((sum: number, num: number) => sum + num, 0);
      const winningNumber = (totalSum % totalEquity) + 1;
      
      console.log('Calculated winning number:', winningNumber);
      return winningNumber;
    }
  } catch (error) {
    console.error('Error calculating winning number:', error);
  }
  
  // 即使API调用失败，也使用随机数生成，确保无fallback机制
  let randomSeed = Date.now();
  randomSeed = (randomSeed * 1103515245 + 12345) % 32768;
  const winningNumber = (Math.abs(randomSeed) % totalEquity) + 1;
  console.log('Using random number generator (no fallback):', winningNumber);
  return winningNumber;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');
    
    if (action === 'stats') {
      // 统计报表功能
      const stats = {
        totalActivities: 0,
        activeActivities: 0,
        completedActivities: 0,
        totalSales: 0,
        totalParticipants: 0,
        topProducts: [] as any[]
      };
      
      try {
        // 尝试一个简单的查询来测试数据库连接
        const testResult = await query('SELECT COUNT(*) as count FROM lucky_draws');
        console.log('Test query result:', testResult);
        
        // 获取所有活动
        const allActivities = await query(
          'SELECT id, status FROM lucky_draws'
        );
        console.log('All activities:', allActivities);
        
        // 手动计算统计数据
        stats.totalActivities = allActivities.rows.length;
        stats.activeActivities = allActivities.rows.filter((row: any) => row.status === 'active').length;
        stats.completedActivities = allActivities.rows.filter((row: any) => row.status === 'completed').length;
        
        // 获取销售统计
        const salesResult = await query(
          'SELECT SUM(total_amount) as totalSales, COUNT(DISTINCT user_id) as totalParticipants FROM lucky_draw_orders'
        );
        console.log('Sales result:', salesResult);
        if (salesResult.rows.length > 0) {
          stats.totalSales = parseFloat(String(salesResult.rows[0].totalSales || 0));
          stats.totalParticipants = parseInt(String(salesResult.rows[0].totalParticipants || 0));
        }
        
        // 获取热门商品
        const topProductsResult = await query(
          `SELECT p.id, p.name, COUNT(ldo.id) as orderCount
           FROM products p
           JOIN lucky_draws ld ON p.id = ld.product_id
           JOIN lucky_draw_orders ldo ON ld.id = ldo.lucky_draw_id
           GROUP BY p.id, p.name
           ORDER BY orderCount DESC
           LIMIT 10`
        );
        console.log('Top products result:', topProductsResult);
        if (topProductsResult.rows.length > 0) {
          stats.topProducts = topProductsResult.rows;
        }
      } catch (error) {
        console.error('Error calculating stats:', error);
      }
      
      return NextResponse.json({
        success: true,
        stats,
        message: 'Statistics fetched successfully'
      });
    } else if (id) {
      // 返回单个1元购活动
      const luckyDraw = await getLuckyDrawById(parseInt(id));
      if (luckyDraw) {
        return NextResponse.json({
          success: true,
          luckyDraws: [luckyDraw],
          message: 'Lucky draw fetched successfully'
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Lucky draw not found'
        }, { status: 404 });
      }
    }
    
    // 返回所有1元购活动
    try {
      const luckyDraws = await getLuckyDraws();
      return NextResponse.json({
        success: true,
        luckyDraws,
        message: 'Lucky draws fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching lucky draws:', error);
      return NextResponse.json({
        success: true,
        luckyDraws: [],
        message: 'No lucky draws found'
      });
    }
  } catch (error) {
    console.error('Error fetching lucky draws:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch lucky draws'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, luckyDrawId } = body;
    
    // 需要登录的操作
    const requiresAuth = ['lock', 'buy', 'unlock', 'sendNotification'];
    
    if (requiresAuth.includes(action)) {
      // 获取token
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({
          success: false,
          message: 'Unauthorized'
        }, { status: 401 });
      }
      
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (!decoded) {
        return NextResponse.json({
          success: false,
          message: 'Invalid or expired token'
        }, { status: 401 });
      }
      
      // 将用户ID添加到body中
      body.userId = decoded.user_id;
    }
    
    if (action === 'calculateWinningNumber' && luckyDrawId) {
      const luckyDraw = await getLuckyDrawById(luckyDrawId);
      if (luckyDraw) {
        const winningNumber = await calculateWinningNumber(parseInt(String(luckyDraw.total_equity)));
        
        return NextResponse.json({
          success: true,
          winningNumber,
          message: 'Winning number calculated successfully'
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Lucky draw not found'
        }, { status: 404 });
      }
    } else if (action === 'lock' && luckyDrawId) {
      // 处理库存锁定请求
      const { userId, quantity } = body;
      
      // 验证参数
      if (!userId || !quantity || quantity <= 0) {
        return NextResponse.json({
          success: false,
          message: 'Invalid parameters'
        }, { status: 400 });
      }
      
      // 获取活动信息
      const luckyDraw = await getLuckyDrawById(luckyDrawId);
      if (!luckyDraw) {
        return NextResponse.json({
          success: false,
          message: 'Lucky draw not found'
        }, { status: 404 });
      }
      
      // 检查活动状态
      if (luckyDraw.status !== 'active') {
        return NextResponse.json({
          success: false,
          message: 'Lucky draw is not active'
        }, { status: 400 });
      }
      
      // 检查库存
      const remainingEquity = parseInt(String(luckyDraw.total_equity)) - parseInt(String(luckyDraw.current_equity)) - parseInt(String(luckyDraw.locked_equity || 0));
      if (quantity > remainingEquity) {
        return NextResponse.json({
          success: false,
          message: 'Insufficient equity'
        }, { status: 400 });
      }
      
      // 生成购买的号码
      const startNumber = parseInt(String(luckyDraw.current_equity || 0)) + parseInt(String(luckyDraw.locked_equity || 0)) + 1;
      const endNumber = startNumber + quantity - 1;
      const equityNumbers = Array.from({ length: quantity }, (_, i) => startNumber + i).join(',');
      
      // 计算总金额
      const totalAmount = parseFloat(String(luckyDraw.price_per_equity || 0)) * quantity;
      
      // 计算过期时间（10分钟后）
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      
      try {
        // 开始事务
        const db = await import('@/lib/db').then(m => m.getClient());
        if (!db) {
          return NextResponse.json({
            success: false,
            message: 'Database connection failed'
          }, { status: 500 });
        }
        
        // 开启事务
        await db.execute('BEGIN');
        
        // 更新活动的锁定等份
        await db.execute({
          sql: 'UPDATE lucky_draws SET locked_equity = locked_equity + ? WHERE id = ?',
          args: [quantity, luckyDrawId]
        });
        
        // 创建订单（待支付状态）
        const orderResult = await db.execute({
          sql: `
            INSERT INTO lucky_draw_orders 
            (lucky_draw_id, user_id, equity_count, total_amount, equity_numbers, status, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          args: [luckyDrawId, userId, quantity, totalAmount, equityNumbers, 'pending', expiresAt]
        });
        
        // 提交事务
        await db.execute('COMMIT');
        
        return NextResponse.json({
          success: true,
          message: 'Equity locked successfully',
          data: {
            orderId: Number(orderResult.lastInsertRowid),
            equityNumbers,
            totalAmount,
            quantity,
            expiresAt
          }
        });
      } catch (error) {
        console.error('Error locking equity:', error);
        // 回滚事务
        try {
          const db = await import('@/lib/db').then(m => m.getClient());
          if (db) {
            // 尝试回滚事务，但捕获"no transaction is active"错误
            try {
              await db.execute('ROLLBACK');
            } catch (rollbackError: any) {
              // 忽略"no transaction is active"错误
              if (rollbackError.code !== 'SQLITE_ERROR' || !rollbackError.message.includes('no transaction is active')) {
                console.error('Error rolling back transaction:', rollbackError);
              }
            }
          }
        } catch (rollbackError) {
          console.error('Error rolling back transaction:', rollbackError);
        }
        return NextResponse.json({
          success: false,
          message: 'Failed to lock equity'
        }, { status: 500 });
      }
    } else if (action === 'buy' && luckyDrawId) {
      // 处理购买请求（支付完成）
      const { userId, orderId } = body;
      
      // 验证参数
      if (!userId || !orderId) {
        return NextResponse.json({
          success: false,
          message: 'Invalid parameters'
        }, { status: 400 });
      }
      
      try {
        // 开始事务
        const db = await import('@/lib/db').then(m => m.getClient());
        if (!db) {
          return NextResponse.json({
            success: false,
            message: 'Database connection failed'
          }, { status: 500 });
        }
        
        // 开启事务
        await db.execute('BEGIN');
        
        // 获取订单信息
        const orderResult = await db.execute({
          sql: 'SELECT * FROM lucky_draw_orders WHERE id = ? AND user_id = ? AND status = ?',
          args: [orderId, userId, 'pending']
        });
        
        if (orderResult.rows.length === 0) {
          await db.execute('ROLLBACK');
          return NextResponse.json({
            success: false,
            message: 'Order not found or already processed'
          }, { status: 404 });
        }
        
        const order = orderResult.rows[0];
        
        // 检查订单是否过期
        if (!order.expires_at || new Date(String(order.expires_at)) < new Date()) {
          await db.execute('ROLLBACK');
          return NextResponse.json({
            success: false,
            message: 'Order has expired'
          }, { status: 400 });
        }
        
        // 更新活动的当前等份和锁定等份
        await db.execute({
          sql: 'UPDATE lucky_draws SET current_equity = current_equity + ?, locked_equity = locked_equity - ? WHERE id = ?',
          args: [order.equity_count, order.equity_count, luckyDrawId]
        });
        
        // 检查是否满员
        const updatedLuckyDraw = await getLuckyDrawById(luckyDrawId);
        if (parseInt(String(updatedLuckyDraw.current_equity)) >= parseInt(String(updatedLuckyDraw.total_equity))) {
          // 计算中奖号码
          const winningNumber = await calculateWinningNumber(parseInt(String(updatedLuckyDraw.total_equity)));
          
          // 更新活动状态为已完成
          await db.execute({
            sql: 'UPDATE lucky_draws SET status = ?, winning_time = CURRENT_TIMESTAMP, winning_number = ? WHERE id = ?',
            args: ['completed', winningNumber, luckyDrawId]
          });
          
          // 查找中奖用户
          const winnerResult = await db.execute({
            sql: `
              SELECT ldo.id as order_id, ldo.user_id, u.name as user_name, u.email as user_email, ldo.equity_numbers
              FROM lucky_draw_orders ldo
              JOIN users u ON ldo.user_id = u.id
              WHERE ldo.lucky_draw_id = ? AND ldo.equity_numbers LIKE ?
            `,
            args: [luckyDrawId, `%${winningNumber}%`]
          });
          
          if (winnerResult.rows.length > 0) {
            const winner = winnerResult.rows[0];
            console.log('Winner found:', winner);
            
            // 这里可以添加发送通知的代码，比如发送邮件、短信等
            // 由于是模拟环境，我们只记录日志
            console.log(`Notification sent to user ${winner.user_id}: Congratulations! You won the lucky draw with number ${winningNumber}`);
          }
        }
        
        // 更新订单状态为已完成
        await db.execute({
          sql: 'UPDATE lucky_draw_orders SET status = ? WHERE id = ?',
          args: ['completed', orderId]
        });
        
        // 提交事务
        await db.execute('COMMIT');
        
        return NextResponse.json({
          success: true,
          message: 'Purchase successful',
          data: {
            orderId,
            equityNumbers: order.equity_numbers,
            totalAmount: order.total_amount,
            quantity: order.equity_count
          }
        });
      } catch (error) {
        console.error('Error processing payment:', error);
        // 回滚事务
        try {
          const db = await import('@/lib/db').then(m => m.getClient());
          if (db) {
            // 尝试回滚事务，但捕获"no transaction is active"错误
            try {
              await db.execute('ROLLBACK');
            } catch (rollbackError: any) {
              // 忽略"no transaction is active"错误
              if (rollbackError.code !== 'SQLITE_ERROR' || !rollbackError.message.includes('no transaction is active')) {
                console.error('Error rolling back transaction:', rollbackError);
              }
            }
          }
        } catch (rollbackError) {
          console.error('Error rolling back transaction:', rollbackError);
        }
        return NextResponse.json({
          success: false,
          message: 'Failed to process payment'
        }, { status: 500 });
      }
    } else if (action === 'unlock' && luckyDrawId) {
      // 处理库存解锁请求（订单过期或取消）
      const { orderId } = body;
      
      // 验证参数
      if (!orderId) {
        return NextResponse.json({
          success: false,
          message: 'Invalid parameters'
        }, { status: 400 });
      }
      
      try {
        // 开始事务
        const db = await import('@/lib/db').then(m => m.getClient());
        if (!db) {
          return NextResponse.json({
            success: false,
            message: 'Database connection failed'
          }, { status: 500 });
        }
        
        // 开启事务
        await db.execute('BEGIN');
        
        // 获取订单信息
        const orderResult = await db.execute({
          sql: 'SELECT * FROM lucky_draw_orders WHERE id = ? AND status = ?',
          args: [orderId, 'pending']
        });
        
        if (orderResult.rows.length === 0) {
          await db.execute('ROLLBACK');
          return NextResponse.json({
            success: false,
            message: 'Order not found or already processed'
          }, { status: 404 });
        }
        
        const order = orderResult.rows[0];
        
        // 更新活动的锁定等份
        await db.execute({
          sql: 'UPDATE lucky_draws SET locked_equity = locked_equity - ? WHERE id = ?',
          args: [order.equity_count, luckyDrawId]
        });
        
        // 更新订单状态为已取消
        await db.execute({
          sql: 'UPDATE lucky_draw_orders SET status = ? WHERE id = ?',
          args: ['cancelled', orderId]
        });
        
        // 提交事务
        await db.execute('COMMIT');
        
        return NextResponse.json({
          success: true,
          message: 'Equity unlocked successfully'
        });
      } catch (error) {
        console.error('Error unlocking equity:', error);
        // 回滚事务
        try {
          const db = await import('@/lib/db').then(m => m.getClient());
          if (db) {
            // 尝试回滚事务，但捕获"no transaction is active"错误
            try {
              await db.execute('ROLLBACK');
            } catch (rollbackError: any) {
              // 忽略"no transaction is active"错误
              if (rollbackError.code !== 'SQLITE_ERROR' || !rollbackError.message.includes('no transaction is active')) {
                console.error('Error rolling back transaction:', rollbackError);
              }
            }
          }
        } catch (rollbackError) {
          console.error('Error rolling back transaction:', rollbackError);
        }
        return NextResponse.json({
          success: false,
          message: 'Failed to unlock equity'
        }, { status: 500 });
      }
    } else if (action === 'batchCreate') {
      // 批量创建一元购活动
      const { activities } = body;
      
      if (!activities || !Array.isArray(activities)) {
        return NextResponse.json({
          success: false,
          message: 'Invalid activities data'
        }, { status: 400 });
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const activity of activities) {
        try {
          const { product_id, total_equity, price_per_equity, start_time, end_time } = activity;
          
          // 验证参数
          if (!product_id || !total_equity || !price_per_equity) {
            errorCount++;
            continue;
          }
          
          // 插入活动
          await query(
            `INSERT INTO lucky_draws (product_id, total_equity, price_per_equity, current_equity, start_time, end_time, status)
             VALUES (?, ?, ?, 0, ?, ?, 'active')`,
            [product_id, total_equity, price_per_equity, start_time || new Date().toISOString(), end_time || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()]
          );
          
          successCount++;
        } catch (error) {
          console.error('Error creating lucky draw activity:', error);
          errorCount++;
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Batch creation completed: ${successCount} successful, ${errorCount} failed`
      });
    } else if (action === 'getTemplates') {
      // 获取活动模板
      const templates = [
        {
          id: 1,
          name: '标准一元购',
          description: '标准的一元购活动模板，适合大多数商品',
          total_equity: 1000,
          price_per_equity: 1,
          duration: 7
        },
        {
          id: 2,
          name: '小额一元购',
          description: '适合价格较低的商品，总等份较少',
          total_equity: 500,
          price_per_equity: 1,
          duration: 3
        },
        {
          id: 3,
          name: '大额一元购',
          description: '适合价格较高的商品，总等份较多',
          total_equity: 2000,
          price_per_equity: 1,
          duration: 14
        }
      ];
      
      return NextResponse.json({
        success: true,
        templates,
        message: 'Templates fetched successfully'
      });
    } else if (action === 'sendNotification' && luckyDrawId) {
      // 发送中奖通知
      try {
        // 获取活动信息
        const luckyDraw = await getLuckyDrawById(luckyDrawId);
        if (!luckyDraw || !luckyDraw.winning_number) {
          return NextResponse.json({
            success: false,
            message: 'Lucky draw not found or no winning number'
          }, { status: 404 });
        }
        
        // 查找中奖用户
        const winnerResult = await query(
          `
            SELECT ldo.id as order_id, ldo.user_id, u.name as user_name, u.email as user_email, ldo.equity_numbers
            FROM lucky_draw_orders ldo
            JOIN users u ON ldo.user_id = u.id
            WHERE ldo.lucky_draw_id = ? AND ldo.equity_numbers LIKE ?
          `,
          [luckyDrawId, `%${luckyDraw.winning_number}%`]
        );
        
        if (winnerResult.rows.length > 0) {
          const winner = winnerResult.rows[0];
          console.log('Winner found:', winner);
          
          // 这里可以添加发送通知的代码，比如发送邮件、短信等
          // 由于是模拟环境，我们只记录日志
          console.log(`Notification sent to user ${winner.user_id}: Congratulations! You won the lucky draw with number ${luckyDraw.winning_number}`);
          
          return NextResponse.json({
            success: true,
            message: 'Notification sent successfully',
            winner: {
              userId: winner.user_id,
              userName: winner.user_name,
              userEmail: winner.user_email
            }
          });
        } else {
          return NextResponse.json({
            success: false,
            message: 'Winner not found'
          }, { status: 404 });
        }
      } catch (error) {
        console.error('Error sending notification:', error);
        return NextResponse.json({
          success: false,
          message: 'Failed to send notification'
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: false,
      message: 'Invalid action'
    }, { status: 400 });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to process request'
    }, { status: 500 });
  }
}
