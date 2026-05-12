import { query } from '@/lib/db';
import { OrderEvent, OrderStatusService } from '@/lib/order-status-service';
import { releaseOrderResources } from '@/lib/order-release-service';
import { buildRefundSuccessExtraData } from '@/lib/refund-success';

interface CompleteRefundSuccessInput {
  orderNumber?: string | null;
  referenceId?: string | null;
  platform: string;
  transactionId?: string | null;
  reason?: string;
  operatorId?: number | null;
  operatorName?: string;
}

export async function completeRefundSuccess(input: CompleteRefundSuccessInput) {
  const operatorId = input.operatorId ?? 0;
  const operatorName = input.operatorName || `${input.platform}_notify`;

  const lookupValue = input.orderNumber || input.referenceId;
  if (!lookupValue) {
    return { success: false, error: 'MISSING_ORDER_REFERENCE' };
  }

  await query('BEGIN TRANSACTION');
  let order: any = null;

  try {
    const orderResult = input.orderNumber
      ? await query(
          `SELECT id, user_id, order_number, order_status, payment_status, payment_method, reference_id
           FROM orders WHERE order_number = ?`,
          [input.orderNumber]
        )
      : await query(
          `SELECT id, user_id, order_number, order_status, payment_status, payment_method, reference_id
           FROM orders WHERE reference_id = ?`,
          [input.referenceId]
        );

    if (orderResult.rows.length === 0) {
      await query('ROLLBACK');
      return { success: false, error: 'ORDER_NOT_FOUND' };
    }

    const orderRow = orderResult.rows[0];
    order = orderRow;
    if (orderRow.order_status === 'refunded' && orderRow.payment_status === 'refunded') {
      await query('ROLLBACK');
      return {
        success: true,
        alreadyCompleted: true,
        orderId: order.id,
        orderNumber: order.order_number,
        orderStatus: order.order_status,
      };
    }

    if (orderRow.order_status !== 'refunding') {
      await query('ROLLBACK');
      return {
        success: false,
        error: 'INVALID_ORDER_STATUS',
        orderId: orderRow.id,
        orderNumber: orderRow.order_number,
        orderStatus: orderRow.order_status,
      };
    }

    const refundSuccessData = buildRefundSuccessExtraData({
      orderId: Number(orderRow.id),
      userId: Number(orderRow.user_id || 0),
      operatorId,
      operatorName,
      reason: input.reason || '支付通道退款成功',
      platform: input.platform,
      transactionId: input.transactionId || input.referenceId || null,
    });

    if (Number(orderRow.user_id || 0) > 0) {
      await releaseOrderResources(refundSuccessData.releaseOrderResources);
    }

    const statusChange = await OrderStatusService.changeStatus(
      Number(orderRow.id),
      OrderEvent.REFUND_SUCCESS,
      {
        type: 'system',
        id: operatorId,
        name: operatorName,
      },
      {
        ...refundSuccessData,
        useExistingTransaction: true,
      }
    );

    if (!statusChange.success) {
      await query('ROLLBACK');
      return {
        success: false,
        error: statusChange.error || 'REFUND_SUCCESS_FAILED',
        orderId: orderRow.id,
        orderNumber: orderRow.order_number,
        orderStatus: orderRow.order_status,
      };
    }

    await query('COMMIT');

    return {
      success: true,
      alreadyCompleted: false,
      orderId: order.id,
      orderNumber: order.order_number,
      fromStatus: statusChange.fromStatus,
      toStatus: statusChange.toStatus,
    };
  } catch (error) {
    await query('ROLLBACK');
    return {
      success: false,
      error: 'REFUND_SUCCESS_FAILED',
      orderId: order?.id || null,
      orderNumber: order?.order_number || input.orderNumber || null,
      orderStatus: order?.order_status || null,
    };
  }
}
