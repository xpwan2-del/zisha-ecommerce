import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';
import { OrderEvent, OperatorType, OrderStatusService } from '@/lib/order-status-service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  logMonitor('ORDERS', 'REQUEST', { method: 'POST', path: '/api/orders/[id]/confirm' });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) return authResult.response;

    const { id } = await params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ success: false, error: 'INVALID_ORDER_ID' }, { status: 400 });
    }

    const orderResult = await query('SELECT id, user_id, order_number, order_status FROM orders WHERE id = ?', [orderId]);
    if (orderResult.rows.length === 0) {
      logMonitor('ORDERS', 'NOT_FOUND', { action: 'CONFIRM_RECEIPT', orderId });
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    const order = orderResult.rows[0];
    if (authResult.user?.role !== 'admin' && order.user_id !== authResult.user?.userId) {
      logMonitor('ORDERS', 'AUTH_FAILED', { action: 'CONFIRM_RECEIPT', orderId });
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    if (order.order_status !== 'shipped') {
      logMonitor('ORDERS', 'VALIDATION_FAILED', { action: 'CONFIRM_RECEIPT', orderId, orderStatus: order.order_status });
      return NextResponse.json({ success: false, error: 'INVALID_ORDER_STATUS' }, { status: 400 });
    }

    const statusChange = await OrderStatusService.changeStatus(
      orderId,
      OrderEvent.USER_CONFIRM,
      {
        type: OperatorType.USER,
        id: authResult.user?.userId || 0,
        name: authResult.user?.name || 'User',
      },
      {
        reason: '用户确认收货',
      }
    );

    if (!statusChange.success) {
      logMonitor('ORDERS', 'ERROR', {
        action: 'CONFIRM_RECEIPT_FAILED',
        orderId,
        orderNumber: order.order_number,
        error: statusChange.error,
      });
      return NextResponse.json({ success: false, error: statusChange.error || 'CONFIRM_FAILED' }, { status: 400 });
    }

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'CONFIRM_RECEIPT',
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
    logMonitor('ORDERS', 'ERROR', { action: 'CONFIRM_RECEIPT', error: error?.message || String(error) });
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
