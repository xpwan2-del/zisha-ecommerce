import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
import { OrderEvent, OperatorType, OrderStatusService } from '@/lib/order-status-service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  logMonitor('ORDERS', 'REQUEST', { method: 'POST', path: '/api/orders/[id]/auto-complete' });

  try {
    const token = request.headers.get('x-auto-complete-token');
    const systemToken = process.env.ORDER_AUTO_COMPLETE_TOKEN || 'SYSTEM_INTERNAL_TASK_TOKEN';
    if (!token || token !== systemToken) {
      logMonitor('ORDERS', 'AUTH_FAILED', { action: 'AUTO_COMPLETE_ORDER', reason: 'Invalid token' });
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const { id } = await params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ success: false, error: 'INVALID_ORDER_ID' }, { status: 400 });
    }

    const orderResult = await query('SELECT id, order_number, order_status FROM orders WHERE id = ?', [orderId]);
    if (orderResult.rows.length === 0) {
      logMonitor('ORDERS', 'NOT_FOUND', { action: 'AUTO_COMPLETE_ORDER', orderId });
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    const order = orderResult.rows[0];
    if (order.order_status !== 'delivered') {
      logMonitor('ORDERS', 'VALIDATION_FAILED', { action: 'AUTO_COMPLETE_ORDER', orderId, orderStatus: order.order_status });
      return NextResponse.json({ success: false, error: 'INVALID_ORDER_STATUS' }, { status: 400 });
    }

    const statusChange = await OrderStatusService.changeStatus(
      orderId,
      OrderEvent.AUTO_COMPLETE,
      {
        type: OperatorType.SYSTEM,
        id: 0,
        name: 'auto_complete_job',
      },
      {
        reason: '系统自动完成订单',
      }
    );

    if (!statusChange.success) {
      logMonitor('ORDERS', 'ERROR', {
        action: 'AUTO_COMPLETE_ORDER_FAILED',
        orderId,
        orderNumber: order.order_number,
        error: statusChange.error,
      });
      return NextResponse.json({ success: false, error: statusChange.error || 'AUTO_COMPLETE_FAILED' }, { status: 400 });
    }

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'AUTO_COMPLETE_ORDER',
      orderId,
      orderNumber: order.order_number,
      fromStatus: statusChange.fromStatus,
      toStatus: statusChange.toStatus,
    });

    return NextResponse.json({
      success: true,
      data: {
        order_id: orderId,
        order_status: statusChange.toStatus,
      },
    });
  } catch (error: any) {
    logMonitor('ORDERS', 'ERROR', { action: 'AUTO_COMPLETE_ORDER', error: error?.message || String(error) });
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
