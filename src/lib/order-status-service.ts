import { query } from './db';
export { OrderStatus, OrderEvent, OperatorType, PaymentStatus, AfterSaleStatus } from './order-status-config';
export type { OrderStatusType, OrderEventType } from './order-status-config';
import { AfterSaleStatus, OrderEvent, OrderStatus, PaymentStatus } from './order-status-config';

interface StatusChangeExtraData extends Record<string, any> {
  paymentStatus?: string;
  afterSaleStatus?: string;
  refundFromStatus?: string | null;
  paidAt?: string | null;
  referenceId?: string | null;
  paymentMethod?: string | null;
  useExistingTransaction?: boolean;
}

interface ResolvedStateFields {
  targetStatus: string;
  paymentStatus: string;
  afterSaleStatus: string;
  refundFromStatus: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  referenceId: string | null;
}

export class OrderStatusService {
  static async changeStatus(
    orderId: number,
    eventCode: string,
    operatorInfo: {
      type: 'user' | 'system' | 'admin';
      id: number;
      name: string;
    },
    extraData?: StatusChangeExtraData
  ): Promise<{ success: boolean; error?: string; fromStatus?: string; toStatus?: string }> {
    const orderResult = await query(
      `SELECT order_number, order_status, payment_status, after_sale_status, refund_from_status
       FROM orders WHERE id = ?`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return { success: false, error: 'ORDER_NOT_FOUND' };
    }

    const order = orderResult.rows[0];
    const currentStatus = order.order_status;

    const transitionResult = await query(
      `SELECT to_status, is_allowed FROM order_status_transitions
       WHERE from_status = ? AND event_code = ? AND is_allowed = 1`,
      [currentStatus, eventCode]
    );

    if (transitionResult.rows.length === 0) {
      console.error(`[OrderStatus] Invalid transition: ${currentStatus} + ${eventCode}`);
      return { success: false, error: `INVALID_TRANSITION:${currentStatus}:${eventCode}` };
    }

    const transitionTargetStatus = transitionResult.rows[0].to_status;
    const resolvedState = this.resolveStateFields(order, eventCode, transitionTargetStatus, extraData);
    const now = new Date().toISOString();
    const useExistingTransaction = extraData?.useExistingTransaction === true;

    if (!useExistingTransaction) {
      await query('BEGIN TRANSACTION');
    }

    try {
      await query(
        `INSERT INTO order_status_logs (
          order_id, order_number, old_status, new_status,
          change_reason, changed_by, operator_type, operator_name,
          event_code, extra_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          order.order_number,
          currentStatus,
          resolvedState.targetStatus,
          `Event: ${eventCode}`,
          operatorInfo.id,
          operatorInfo.type,
          operatorInfo.name,
          eventCode,
          extraData ? JSON.stringify(extraData) : null
        ]
      );

      const queryResult = await query(
        `UPDATE orders
         SET order_status = ?,
             payment_status = ?,
             after_sale_status = ?,
             refund_from_status = ?,
             payment_method = COALESCE(?, payment_method),
             reference_id = COALESCE(?, reference_id),
             paid_at = COALESCE(?, paid_at),
             updated_at = ?
         WHERE id = ? AND order_status = ?`,
        [
          resolvedState.targetStatus,
          resolvedState.paymentStatus,
          resolvedState.afterSaleStatus,
          resolvedState.refundFromStatus,
          resolvedState.paymentMethod,
          resolvedState.referenceId,
          resolvedState.paidAt,
          now,
          orderId,
          currentStatus,
        ]
      );

      if (queryResult.changes === 0) {
        throw new Error('CONCURRENT_STATUS_CHANGE');
      }

      if (!useExistingTransaction) {
        await query('COMMIT');
      }

      return {
        success: true,
        fromStatus: currentStatus,
        toStatus: resolvedState.targetStatus,
      };
    } catch (error) {
      if (!useExistingTransaction) {
        await query('ROLLBACK');
      }
      console.error('[OrderStatus] Error:', error);
      return { success: false, error: 'STATUS_CHANGE_FAILED' };
    }
  }

  static async getStatusHistory(orderId: number) {
    const result = await query(
      `SELECT * FROM order_status_logs
       WHERE order_id = ?
       ORDER BY created_at ASC`,
      [orderId]
    );
    return result.rows;
  }

  private static resolveStateFields(
    order: any,
    eventCode: string,
    transitionTargetStatus: string,
    extraData?: StatusChangeExtraData
  ): ResolvedStateFields {
    let targetStatus = transitionTargetStatus;
    let paymentStatus = extraData?.paymentStatus ?? order.payment_status ?? PaymentStatus.UNPAID;
    let afterSaleStatus = extraData?.afterSaleStatus ?? order.after_sale_status ?? AfterSaleStatus.NONE;
    let refundFromStatus = extraData?.refundFromStatus ?? order.refund_from_status ?? null;
    let paidAt = extraData?.paidAt ?? null;
    let paymentMethod = extraData?.paymentMethod ?? null;
    let referenceId = extraData?.referenceId ?? null;

    switch (eventCode) {
      case OrderEvent.PAY_SUCCESS:
        targetStatus = OrderStatus.PAID;
        paymentStatus = PaymentStatus.PAID;
        afterSaleStatus = AfterSaleStatus.NONE;
        refundFromStatus = null;
        paidAt = extraData?.paidAt ?? new Date().toISOString();
        break;
      case OrderEvent.REFUND_REQUEST:
        targetStatus = OrderStatus.REFUNDING_PAYMENT;
        paymentStatus = order.payment_status ?? PaymentStatus.PAID;
        afterSaleStatus = AfterSaleStatus.REQUESTED;
        refundFromStatus = order.order_status;
        break;
      case OrderEvent.REFUND_APPROVE:
        targetStatus = OrderStatus.REFUNDING;
        paymentStatus = PaymentStatus.REFUNDING;
        afterSaleStatus = AfterSaleStatus.APPROVED;
        refundFromStatus = order.refund_from_status ?? order.order_status;
        break;
      case OrderEvent.REFUND_REJECT:
        targetStatus = order.refund_from_status || OrderStatus.PAID;
        paymentStatus = PaymentStatus.PAID;
        afterSaleStatus = AfterSaleStatus.REJECTED;
        refundFromStatus = null;
        break;
      case OrderEvent.REFUND_SUCCESS:
        targetStatus = OrderStatus.REFUNDED;
        paymentStatus = PaymentStatus.REFUNDED;
        afterSaleStatus = AfterSaleStatus.COMPLETED;
        refundFromStatus = null;
        break;
      case OrderEvent.USER_CANCEL:
      case OrderEvent.ADMIN_CANCEL:
      case OrderEvent.MERCHANT_CANCEL:
      case OrderEvent.TIMEOUT_CANCEL:
        targetStatus = OrderStatus.CANCELLED;
        afterSaleStatus = AfterSaleStatus.NONE;
        refundFromStatus = null;
        break;
      case OrderEvent.MERCHANT_SHIP:
        targetStatus = OrderStatus.SHIPPED;
        break;
      case OrderEvent.USER_CONFIRM:
        targetStatus = OrderStatus.DELIVERED;
        break;
      case OrderEvent.AUTO_COMPLETE:
        targetStatus = OrderStatus.COMPLETED;
        break;
      default:
        break;
    }

    return {
      targetStatus,
      paymentStatus,
      afterSaleStatus,
      refundFromStatus,
      paidAt,
      paymentMethod,
      referenceId,
    };
  }
}
