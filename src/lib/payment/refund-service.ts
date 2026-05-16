import { query } from '@/lib/db';
import { OrderEvent, OrderStatusService } from '@/lib/order-status-service';
import { PaymentService } from './PaymentService';
import { AlipayAdapter } from './alipay-adapter';
import { PayPalAdapter } from './paypal-adapter';
import { StripeAdapter } from './stripe-adapter';
import type { PaymentAdapter, RefundPaymentRequest, RefundPaymentResult } from './types';

interface ApproveRefundInput {
  orderId: number;
  operatorId: number;
  operatorName: string;
  reason?: string;
}

interface RefundApprovalResult {
  success: boolean;
  status?: number;
  error?: string;
  detail?: string;
  orderId?: number;
  orderNumber?: string;
  fromStatus?: string;
  toStatus?: string;
  refundResult?: RefundPaymentResult;
}

export class RefundService {
  static async approveRefund(input: ApproveRefundInput): Promise<RefundApprovalResult> {
    await PaymentService.initialize();

    const orderResult = await query(
      `SELECT id, order_number, order_status, payment_status, payment_method, reference_id, final_amount, user_id
       FROM orders WHERE id = ?`,
      [input.orderId]
    );
    if (orderResult.rows.length === 0) {
      return { success: false, status: 404, error: 'ORDER_NOT_FOUND' };
    }

    const order = orderResult.rows[0];
    if (order.order_status !== 'refunding_payment') {
      return { success: false, status: 400, error: 'INVALID_ORDER_STATUS' };
    }

    const adapter = this.getAdapter(String(order.payment_method || ''));
    if (!adapter) {
      return { success: false, status: 400, error: 'PAYMENT_METHOD_NOT_SUPPORTED' };
    }

    const refundRequest: RefundPaymentRequest = {
      orderId: Number(order.id),
      orderNumber: String(order.order_number),
      paymentMethod: String(order.payment_method || ''),
      referenceId: order.reference_id || null,
      amount: Number(order.final_amount || 0),
      currency: String((order as any).currency || 'USD'),
      reason: input.reason || '管理员同意退款',
      operatorId: input.operatorId,
      operatorName: input.operatorName,
    };

    let refundResult: RefundPaymentResult;
    try {
      refundResult = await adapter.refundPayment(refundRequest);
    } catch (error) {
      return {
        success: false,
        status: 502,
        error: 'REFUND_GATEWAY_FAILED',
        detail: error instanceof Error ? error.message : String(error),
      };
    }

    if (!refundResult.success) {
      return {
        success: false,
        status: 502,
        error: 'REFUND_GATEWAY_REJECTED',
        refundResult,
      };
    }

    const statusChange = await OrderStatusService.changeStatus(
      Number(order.id),
      OrderEvent.REFUND_APPROVE,
      {
        type: 'admin',
        id: input.operatorId,
        name: input.operatorName,
      },
      {
        reason: input.reason || '管理员同意退款',
        refundId: refundResult.refundId || null,
        refundPlatform: refundResult.platform || null,
        refundStatus: refundResult.status,
      }
    );

    if (!statusChange.success) {
      return {
        success: false,
        status: 400,
        error: statusChange.error || 'STATUS_CHANGE_FAILED',
        refundResult,
      };
    }

    return {
      success: true,
      orderId: Number(order.id),
      orderNumber: String(order.order_number),
      fromStatus: statusChange.fromStatus,
      toStatus: statusChange.toStatus,
      refundResult,
    };
  }
  private static getAdapter(paymentMethod: string): PaymentAdapter | null {
    switch (paymentMethod.toLowerCase()) {
      case 'alipay':
        return new AlipayAdapter();
      case 'paypal':
        return new PayPalAdapter();
      case 'stripe':
        return new StripeAdapter();
      default:
        return null;
    }
  }
}
