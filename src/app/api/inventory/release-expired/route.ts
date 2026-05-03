import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * @api {POST} /api/inventory/release-expired 释放超时库存
 * @apiName ReleaseExpiredInventory
 * @apiGroup INVENTORY
 * @apiDescription 扫描所有 pending 状态且下单超过 30 分钟的订单，
 * 将库存归还，标记订单为 cancelled，记录流水和支付日志。
 * 可被定时任务或 /payment-result 页面加载时触发。
 *
 * @apiSuccess {Number} releasedOrders 释放的订单数
 * @apiSuccess {Number} restoredItems 归还库存的商品数
 * @apiSuccess {Array} details 详情列表
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('INVENTORY', 'REQUEST', {
    method: 'POST',
    path: '/api/inventory/release-expired'
  });

  try {
    const expiredOrdersResult = await query(
      `SELECT o.id, o.order_number, o.final_amount, o.payment_method
       FROM orders o
       WHERE o.order_status = 'pending'
         AND o.created_at IS NOT NULL
         AND datetime(o.created_at, '+30 minutes') < datetime('now')`
    );

    const expiredOrders = expiredOrdersResult.rows;
    let releasedOrders = 0;
    let restoredItems = 0;
    const details: any[] = [];

    const cancelTypeResult = await query(
      'SELECT id FROM transaction_type WHERE code = ?',
      ['order_cancel']
    );
    const cancelTypeId = cancelTypeResult.rows[0]?.id || null;

    for (const order of expiredOrders) {
      try {
        const itemsResult = await query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
          [order.id]
        );

        for (const item of itemsResult.rows) {
          const productResult = await query(
            'SELECT name FROM products WHERE id = ?',
            [item.product_id]
          );
          const productName = productResult.rows[0]?.name || 'Product';

          const beforeResult = await query(
            'SELECT quantity FROM inventory WHERE product_id = ?',
            [item.product_id]
          );
          const beforeStock = beforeResult.rows[0]?.quantity || 0;
          await query(
            'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
            [item.quantity, item.product_id]
          );

          if (cancelTypeId) {
            await query(
              `INSERT INTO inventory_transactions (
                product_id, product_name, transaction_type_id, quantity_change,
                quantity_before, quantity_after, reason, reference_type, reference_id,
                operator_id, operator_name, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
              [
                item.product_id,
                productName,
                cancelTypeId,
                item.quantity,
                beforeStock,
                beforeStock + item.quantity,
                '订单超时自动取消，归还库存',
                'order_timeout',
                order.id,
                null,
                'SYSTEM'
              ]
            );
          }

          restoredItems++;
        }

        await query(
          `UPDATE orders SET
            order_status = 'cancelled',
            payment_status = 'cancelled',
            updated_at = datetime('now')
           WHERE id = ?`,
          [order.id]
        );

        await query(
          `INSERT INTO payment_logs (
            order_id, order_number, payment_method, status,
            error_code, error_message, is_success,
            payment_stage, amount, currency, extra_data, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            order.id,
            order.order_number,
            order.payment_method || 'unknown',
            'cancelled',
            'TIMEOUT',
            'Order expired, inventory released',
            0,
            'timeout',
            order.final_amount || 0,
            'USD',
            JSON.stringify({ reason: 'timeout', released_at: new Date().toISOString() })
          ]
        );
        details.push({
          orderId: order.id,
          orderNumber: order.order_number,
          itemsRestored: itemsResult.rows.length
        });

        releasedOrders++;
      } catch (itemError) {
        logMonitor('INVENTORY', 'ERROR', {
          action: 'RELEASE_EXPIRED_ITEM',
          orderId: order.id,
          error: String(itemError)
        });
      }
    }

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'RELEASE_EXPIRED_INVENTORY',
      releasedOrders,
      restoredItems,
      expiredOrdersCount: expiredOrders.length
    });

    return NextResponse.json({
      success: true,
      data: {
        releasedOrders,
        restoredItems,
        details
      }
    });
  } catch (error) {
    logMonitor('INVENTORY', 'ERROR', {
      action: 'RELEASE_EXPIRED_INVENTORY',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
