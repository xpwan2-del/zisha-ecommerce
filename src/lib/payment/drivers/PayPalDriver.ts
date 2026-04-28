import { IPaymentDriver, PaymentConfig, PaymentCreateResult, CallbackResult, OrderStatusResult, RefundResult } from '../IPaymentDriver';
import { OrderStatusService } from '@/lib/order-status-service';
import { OrderEvent, OperatorType } from '@/lib/order-status-config';

let PayPalHttpClient: any = null;
let orders: any = null;

async function loadPayPalSDK() {
  if (!PayPalHttpClient) {
    try {
      const sdk = await import('@paypal/checkout-server-sdk');
      PayPalHttpClient = sdk.PayPalHttpClient;
      orders = sdk.orders;
    } catch (error) {
      console.error('[PayPalDriver] Failed to load SDK:', error);
    }
  }
}

export class PayPalDriver implements IPaymentDriver {
  private config: PaymentConfig;
  private client: any = null;

  constructor(config: PaymentConfig) {
    this.config = config;
  }

  private async initializeClient(): Promise<void> {
    if (this.client) return;

    await loadPayPalSDK();
    if (!PayPalHttpClient) return;

    try {
      const configJson = JSON.parse(this.config.config_json || '{}');
      const environment = this.config.is_sandbox ? 'sandbox' : 'live';

      this.client = new PayPalHttpClient({
        environment,
        clientId: configJson.client_id || process.env.PAYPAL_CLIENT_ID || '',
        clientSecret: configJson.client_secret || process.env.PAYPAL_CLIENT_SECRET || ''
      });
    } catch (error) {
      console.error('[PayPalDriver] Initialize failed:', error);
    }
  }

  getMethod(): string {
    return 'paypal';
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
    await this.initializeClient();
    if (!this.client || !orders) {
      return { success: false, error: 'PayPal client not initialized' };
    }

    try {
      const OrdersCreateRequest = orders.OrdersCreateRequest;
      const request = new OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: params.currency || 'USD',
            value: params.amount.toFixed(2)
          },
          description: params.description || `Order ${params.orderNumber}`,
          custom_id: params.orderNumber
        }],
        application_context: {
          return_url: params.returnUrl,
          cancel_url: `${params.returnUrl}?cancel=true`
        }
      });

      const response = await this.client.execute(request);
      const approvalUrl = response.result.links.find((link: any) => link.rel === 'approve')?.href;

      return {
        success: true,
        platformOrderId: response.result.id,
        paymentUrl: approvalUrl
      };
    } catch (error: any) {
      console.error('[PayPalDriver] createPayment failed:', error);
      return { success: false, error: error.message || 'PayPal payment creation failed' };
    }
  }

  async verifyCallback(params: Record<string, string>): Promise<boolean> {
    return true;
  }

  async processCallback(params: Record<string, string>): Promise<CallbackResult> {
    try {
      const orderId = params.order_id || params.id;
      const status = params.status || params.intent;

      return {
        success: status === 'COMPLETED' || status === 'APPROVED',
        orderNumber: (params as any).purchase_units?.[0]?.custom_id || params.custom_id,
        transactionId: orderId,
        status
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async queryOrder(platformOrderId: string): Promise<OrderStatusResult> {
    await this.initializeClient();
    if (!this.client || !orders) {
      return { status: 'failed', platformOrderId };
    }

    try {
      const OrdersGetRequest = orders.OrdersGetRequest;
      const request = new OrdersGetRequest(platformOrderId);
      const response = await this.client.execute(request);

      const status = response.result.status === 'COMPLETED' ? 'success'
        : response.result.status === 'VOIDED' ? 'failed' : 'pending';

      return {
        status,
        platformOrderId: response.result.id
      };
    } catch (error: any) {
      return { status: 'failed', platformOrderId };
    }
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    return { success: false, error: 'PayPal refund not implemented' };
  }
}