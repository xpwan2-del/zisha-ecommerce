// src/lib/payment/alipay-adapter.ts
import crypto from 'crypto';
import { OrderPaymentData, PaymentRequest, RedirectPaymentResult, PaymentAdapter } from './types';
import { logMonitor } from '@/lib/utils/logger';

export class AlipayAdapter implements PaymentAdapter {
  async createPayment(
    orderData: OrderPaymentData,
    request: PaymentRequest
  ): Promise<RedirectPaymentResult> {
    const { order, finalAmount } = orderData;
    const { order_number, source = 'cart', lang = 'zh' } = request;

    logMonitor('PAYMENTS', 'REQUEST', {
      action: 'ALIPAY_ADAPTER_CREATE',
      orderNumber: order_number,
      finalAmount,
    });

    const alipayPartner = process.env.ALIPAY_PARTNER_ID;
    const alipaySellerId = process.env.ALIPAY_SELLER_ID;
    const alipayPrivateKey = process.env.ALIPAY_PRIVATE_KEY;
    const alipayGateway = process.env.ALIPAY_GATEWAY_URL || 'https://openapi.alipaydev.com/gateway.do';
    const alipayAppId = process.env.ALIPAY_APP_ID || '';

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    if (!alipayPartner || !alipaySellerId || !alipayPrivateKey) {
      logMonitor('PAYMENTS', 'INFO', {
        action: 'ALIPAY_MOCK_MODE',
        reason: 'Alipay config not found, using mock URL',
      });
      const mockUrl = `${baseUrl}/cart/success?order_number=${order_number}&payment_method=alipay`;
      return {
        type: 'redirect',
        paymentId: `alipay_mock_${order_number}`,
        redirectUrl: mockUrl,
      };
    }

    const bizContent = {
      out_trade_no: order_number,
      total_amount: finalAmount.toFixed(2),
      subject: `Order Payment - ${order_number}`,
      product_code: 'FAST_INSTANT_TRADE_PAY',
    };

    const bizContentStr = JSON.stringify(bizContent);

    const now = new Date();
    const params: Record<string, string> = {
      app_id: alipayAppId,
      method: 'alipay.trade.page.pay',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: now.toISOString().split('T')[0] + ' ' + now.toTimeString().split(' ')[0],
      version: '1.0',
      notify_url: `${baseUrl}/api/payments/alipay/notify`,
      return_url: `${baseUrl}/api/payments/result?order_number=${order_number}&trade_no={TRADE_NO}&source=${source}&platform=alipay`,
      biz_content: bizContentStr,
    };

    const queryString = new URLSearchParams(params).toString();
    const sign = this.generateRSA2Sign(queryString, alipayPrivateKey);
    params.sign = sign;

    const paymentUrl = `${alipayGateway}?${new URLSearchParams(params).toString()}`;

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'ALIPAY_URL_GENERATED',
      orderNumber: order_number,
      finalAmount,
    });

    return {
      type: 'redirect',
      paymentId: `alipay_${order_number}`,
      redirectUrl: paymentUrl,
    };
  }

  private generateRSA2Sign(content: string, privateKey: string): string {
    const sign = crypto.sign('RSA-SHA256', Buffer.from(content), {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    });
    return sign.toString('base64');
  }
}
