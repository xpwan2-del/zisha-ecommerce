import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
import { OrderEvent, OperatorType, OrderStatusService } from '@/lib/order-status-service';

export async function POST(request: NextRequest) {
  logMonitor('ORDERS', 'REQUEST', { method: 'POST', path: '/api/orders/auto-complete' });

  try {
    const token = request.headers.get('x-auto-complete-token');
    const systemToken = process.env.ORDER_AUTO_COMPLETE_TOKEN || 'SYSTEM_INTERNAL_TASK_TOKEN';

    if (!token || token !== systemToken) {
      logMonitor('ORDERS', 'AUTH_FAILED', { action: 'AUTO_COMPLETE_BATCH', reason: 'Invalid token' });
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const autoCompleteAfterDays = Number(process.env.ORDER_AUTO_COMPLETE_AFTER_DAYS || '7');
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || '50'), 200);

    const deliveredOrdersResult = await query(
      `SELECT id, order_number, order_status, updated_at
       FROM orders
       WHERE order_status = ?
         AND updated_at IS NOT NULL
         AND datetime(updated_at, '+' || ? || ' days') <= datetime('now')
       ORDER BY updated_at ASC
       LIMIT ?`,
      ['delivered', autoCompleteAfterDays, limit]
    );

    const deliveredOrders = deliveredOrdersResult.rows;
    let completedCount = 0;
    let failedCount = 0;
    const details: Array<{ orderId: number; orderNumber: string; status: 'completed' | 'failed'; error?: string }> = [];

    for (const order of deliveredOrders) {
      const statusChange = await OrderStatusService.changeStatus(
        Number(order.id),
        OrderEvent.AUTO_COMPLETE,
        {
          type: OperatorType.SYSTEM,
          id: 0,
          name: 'auto_complete_job',
        },
        {
          reason: '系统批量自动完成订单',
          autoCompleteAfterDays,
        }
      );

      if (!statusChange.success) {
        failedCount += 1;
        details.push({
          orderId: Number(order.id),
          orderNumber: String(order.order_number),
          status: 'failed',
          error: statusChange.error || 'AUTO_COMPLETE_FAILED',
        });

        logMonitor('ORDERS', 'ERROR', {
          action: 'AUTO_COMPLETE_BATCH_ITEM_FAILED',
          orderId: order.id,
          orderNumber: order.order_number,
          error: statusChange.error,
        });
        continue;
      }

      completedCount += 1;
      details.push({
        orderId: Number(order.id),
        orderNumber: String(order.order_number),
        status: 'completed',
      });

      logMonitor('ORDERS', 'SUCCESS', {
        action: 'AUTO_COMPLETE_BATCH_ITEM',
        orderId: order.id,
        orderNumber: order.order_number,
        fromStatus: statusChange.fromStatus,
        toStatus: statusChange.toStatus,
      });
    }

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'AUTO_COMPLETE_BATCH',
      scannedCount: deliveredOrders.length,
      completedCount,
      failedCount,
      autoCompleteAfterDays,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        scannedCount: deliveredOrders.length,
        completedCount,
        failedCount,
        autoCompleteAfterDays,
        limit,
        details,
      },
    });
  } catch (error: any) {
    logMonitor('ORDERS', 'ERROR', {
      action: 'AUTO_COMPLETE_BATCH',
      error: error?.message || String(error),
    });
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
