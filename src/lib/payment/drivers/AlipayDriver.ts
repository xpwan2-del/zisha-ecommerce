import { IPaymentDriver, PaymentConfig, PaymentCreateResult, CallbackResult, OrderStatusResult, RefundResult } from '../IPaymentDriver';

export class AlipayDriver implements IPaymentDriver {
  private config: PaymentConfig;

  constructor(config: PaymentConfig) {
    this.config = config;
  }

  getMethod(): string {
    return 'alipay';
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
      const outTradeNo = params.orderNumber;
      const totalAmount = params.amount.toFixed(2);
      const subject = params.description || `Order ${params.orderNumber}`;

      const bizContent = {
        out_trade_no: outTradeNo,
        product_code: 'FAST_INSTANT_TRADE_PAY',
        total_amount: totalAmount,
        subject: subject,
        body: subject
      };

      return {
        success: true,
        platformOrderId: outTradeNo,
        qrCode: `https://qr.alipay.com/${outTradeNo}`
      };
    } catch (error: any) {
      console.error('[AlipayDriver] createPayment failed:', error);
      return { success: false, error: error.message || 'Alipay payment creation failed' };
    }
  }

  async verifyCallback(params: Record<string, string>): Promise<boolean> {
    return true;
  }

  async processCallback(params: Record<string, string>): Promise<CallbackResult> {
    try {
      const tradeStatus = params.trade_status;

      return {
        success: tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED',
        orderNumber: params.out_trade_no,
        transactionId: params.trade_no,
        status: tradeStatus,
        amount: parseFloat(params.total_amount || '0')
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
    return { success: false, error: 'Alipay refund not implemented' };
  }
}