import { NextResponse } from 'next/server';
import { OrderStatusService, OrderEvent, OperatorType } from '@/lib/order-status-service';
import { releaseOrderResources } from '@/lib/order-release-service';
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

export async function POST() {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'POST',
    path: '/api/inventory/release-expired'
  });

  try {
    const expiredOrdersResult = await query(
      `SELECT o.id, o.user_id, o.order_number, o.final_amount, o.payment_method
       FROM orders o
       WHERE o.order_status = 'pending'
         AND o.created_at IS NOT NULL
         AND datetime(o.created_at, '+30 minutes') < datetime('now')`
    );

    const expiredOrders = expiredOrdersResult.rows;
    let releasedOrders = 0;
    let restoredItems = 0;
    const details: any[] = [];

    for (const order of expiredOrders) {
      try {
        const releaseResult = await releaseOrderResources({
          orderId: order.id,
          userId: order.user_id,
          transactionTypeCode: 'order_cancel',
          inventoryReason: '订单超时自动取消，归还库存',
          referenceType: 'order_timeout',
          operatorId: null,
          operatorName: 'SYSTEM'
        });

        restoredItems += releaseResult.itemsReleased;

        const statusResult = await OrderStatusService.changeStatus(
          order.id,
          OrderEvent.TIMEOUT_CANCEL,
          {
            type: OperatorType.SYSTEM,
            id: 0,
            name: 'SYSTEM'
          },
          {
            reason: 'order_timeout',
            expiredAfterMinutes: 30,
            releasedCouponCount: releaseResult.couponsReleased,
            restoredItemCount: releaseResult.itemsReleased
          }
        );

        if (!statusResult.success) {
          logMonitor('INVENTORY', 'ERROR', {
            action: 'TIMEOUT_CANCEL_STATUS_TRANSITION_FAILED',
            orderId: order.id,
            error: statusResult.error || 'UNKNOWN_STATUS_ERROR'
          });

          await query(
            `UPDATE orders SET
              order_status = 'cancelled',
              updated_at = datetime('now')
             WHERE id = ?`,
            [order.id]
          );
        }

        await query(
          `UPDATE orders SET
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
            'Order expired, inventory released and coupons restored',
            0,
            'timeout',
            order.final_amount || 0,
            'USD',
            JSON.stringify({
              reason: 'timeout',
              released_at: new Date().toISOString(),
              released_coupon_count: releaseResult.couponsReleased,
              restored_item_count: releaseResult.itemsReleased
            })
          ]
        );

        details.push({
          orderId: order.id,
          orderNumber: order.order_number,
          itemsRestored: releaseResult.itemsReleased,
          couponsReleased: releaseResult.couponsReleased
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
