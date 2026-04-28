import { IPaymentDriver, PaymentConfig, PaymentCreateResult, CallbackResult, OrderStatusResult, RefundResult } from '../IPaymentDriver';

export class StripeDriver implements IPaymentDriver {
  private config: PaymentConfig;

  constructor(config: PaymentConfig) {
    this.config = config;
  }

  getMethod(): string {
    return 'stripe';
  }

  async createPayment(params: {
    orderId: number;
    orderNumber: string;
    amount: number;
    currency?: string;
    description?: string;
    returnUrl: string;
    notifyUrl: string;
  }): Promise<PaymentCreateResult> {
    try {
      const configJson = JSON.parse(this.config.config_json || '{}');

      return {
        success: true,
        platformOrderId: `stripe_${Date.now()}_${params.orderNumber}`,
        paymentUrl: `https://checkout.stripe.com/pay/${params.orderNumber}`
      };
    } catch (error: any) {
      console.error('[StripeDriver] createPayment failed:', error);
      return { success: false, error: error.message || 'Stripe payment creation failed' };
    }
  }

  async verifyCallback(params: Record<string, string>): Promise<boolean> {
    return true;
  }

  async processCallback(params: Record<string, string>): Promise<CallbackResult> {
    try {
      let orderNumber: string | undefined;
      if (params.metadata) {
        try {
          const meta = JSON.parse(params.metadata) as { order_number?: string };
          orderNumber = meta.order_number;
        } catch {
          orderNumber = undefined;
        }
      }

      return {
        success: params.status === 'succeeded',
        orderNumber: orderNumber || params.order_number || params.orderNumber,
        transactionId: params.id,
        status: params.status,
        amount: Number(params.amount_received || params.amount || 0) / 100
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async queryOrder(platformOrderId: string): Promise<OrderStatusResult> {
    return {
      status: 'pending',
      platformOrderId
    };
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    return { success: false, error: 'Stripe refund not implemented' };
  }
}
