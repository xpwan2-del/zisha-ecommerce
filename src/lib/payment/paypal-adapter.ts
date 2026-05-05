// src/lib/payment/paypal-adapter.ts
import { OrderPaymentData, PaymentRequest, RedirectPaymentResult, PaymentAdapter } from './types';
import { PaymentService } from '@/lib/payment/PaymentService';
import { logMonitor } from '@/lib/utils/logger';

const PAYPAL_API_BASE_SANDBOX = 'https://api-m.sandbox.paypal.com';
const PAYPAL_API_BASE_LIVE = 'https://api-m.paypal.com';

export class PayPalAdapter implements PaymentAdapter {
  private getConfig() {
    const config = PaymentService.getConfig('paypal');
    if (!config) throw new Error('PayPal configuration not found');
    const configJson = JSON.parse(config.config_json || '{}');
    return {
      clientId: configJson.client_id || '',
      clientSecret: configJson.client_secret || '',
      isSandbox: config.is_sandbox,
      apiBase: config.is_sandbox ? PAYPAL_API_BASE_SANDBOX : PAYPAL_API_BASE_LIVE,
    };
  }

  private async getAccessToken(): Promise<string> {
    const config = this.getConfig();
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await fetch(`${config.apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      logMonitor('PAYMENTS', 'ERROR', {
        action: 'PAYPAL_AUTH_FAILED',
        status: response.status,
      });
      throw new Error('Failed to get PayPal access token');
    }

    const data = await response.json();
    return data.access_token;
  }

  private sanitizeProductName(name: string): string {
    return name.replace(/[^\x00-\x7F]/g, '').substring(0, 127);
  }

  async createPayment(
    orderData: OrderPaymentData,
    request: PaymentRequest
  ): Promise<RedirectPaymentResult> {
    await PaymentService.initialize();
    const config = this.getConfig();

    const { order, items, finalAmount, shippingFee, itemTotal, discountAmount } = orderData;
    const { order_number, currency = 'USD' } = request;

    logMonitor('PAYMENTS', 'REQUEST', {
      action: 'PAYPAL_ADAPTER_CREATE',
      orderNumber: order_number,
      finalAmount,
      currency,
    });

    const paypalItems = items.map((item) => ({
      name: this.sanitizeProductName(item.product_name) || `Product ${item.product_id}`,
      unit_amount: {
        currency_code: currency,
        value: parseFloat(parseFloat(item.original_price.toFixed(2)).toString()),
      },
      quantity: String(item.quantity),
      category: 'PHYSICAL_GOODS' as const,
    }));

    const accessToken = await this.getAccessToken();

    const breakdown: any = {
      item_total: {
        currency_code: currency,
        value: parseFloat(itemTotal.toFixed(2)),
      },
    };

    if (shippingFee > 0) {
      breakdown.shipping = {
        currency_code: currency,
        value: parseFloat(shippingFee.toFixed(2)),
      };
    }

    if (discountAmount > 0) {
      breakdown.discount = {
        currency_code: currency,
        value: parseFloat(discountAmount.toFixed(2)),
      };
    }

    const paypalOrderData = {
      intent: 'CAPTURE' as const,
      purchase_units: [{
        reference_id: order_number,
        custom_id: order_number,
        amount: {
          currency_code: currency,
          value: parseFloat(finalAmount.toFixed(2)),
          breakdown,
        },
        items: paypalItems,
      }],
      application_context: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/cart/success?order_number=${order_number}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/cart/success?order_number=${order_number}&status=cancel&platform=paypal`,
      },
    };

    logMonitor('PAYMENTS', 'INFO', {
      action: 'PAYPAL_SENDING_REQUEST',
      url: `${config.apiBase}/v2/checkout/orders`,
      orderNumber: order_number,
    });

    const response = await fetch(`${config.apiBase}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paypalOrderData),
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { name: 'UNKNOWN_ERROR', message: responseText };
      }

      logMonitor('PAYMENTS', 'ERROR', {
        action: 'PAYPAL_API_ERROR',
        status: response.status,
        errorName: errorData.name,
        errorMessage: errorData.message,
      });

      throw {
        status: response.status,
        error: errorData,
      };
    }

    const paypalResponse = JSON.parse(responseText);

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'PAYPAL_ORDER_CREATED',
      paypalOrderId: paypalResponse.id,
      status: paypalResponse.status,
    });

    const approvalUrl = paypalResponse.links?.find((link: any) => link.rel === 'approve')?.href;

    return {
      type: 'redirect',
      paymentId: paypalResponse.id,
      redirectUrl: approvalUrl,
    };
  }
}
