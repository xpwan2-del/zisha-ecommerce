// src/lib/payment/alipay-adapter.ts
import crypto from 'crypto';
import { OrderPaymentData, PaymentRequest, RedirectPaymentResult, PaymentAdapter } from './types';
import { PaymentService } from './PaymentService';
import { logMonitor } from '@/lib/utils/logger';

function parseAlipayConfig() {
  const config = PaymentService.getConfig('alipay');
  const json = config?.config_json ? JSON.parse(config.config_json) : {};
  const partnerId = json.partner_id || json.partnerId || process.env.ALIPAY_PARTNER_ID;
  const sellerId = json.seller_id || json.sellerId || process.env.ALIPAY_SELLER_ID;
  const privateKey = json.private_key || json.privateKey || process.env.ALIPAY_PRIVATE_KEY;
  const gatewayUrl = json.gateway_url || json.gatewayUrl || process.env.ALIPAY_GATEWAY_URL || 'https://openapi.alipaydev.com/gateway.do';
  const appId = json.app_id || json.appId || process.env.ALIPAY_APP_ID || '';

  return { partnerId, sellerId, privateKey, gatewayUrl, appId };
}

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

    const { partnerId: alipayPartner, sellerId: alipaySellerId, privateKey: alipayPrivateKey, gatewayUrl: alipayGateway, appId: alipayAppId } = parseAlipayConfig();

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

  async queryPayment(outTradeNo: string, tradeNo: string): Promise<{
    trade_status: string;
    total_amount: string;
    out_trade_no: string;
    trade_no: string;
  }> {
    const { privateKey: alipayPrivateKey, gatewayUrl: alipayGateway, appId: alipayAppId } = parseAlipayConfig();

    if (!alipayPrivateKey) {
      throw new Error('Alipay private key not configured, cannot query payment');
    }

    const bizContent = JSON.stringify({ out_trade_no: outTradeNo, trade_no: tradeNo });

    const now = new Date();
    const params: Record<string, string> = {
      app_id: alipayAppId,
      method: 'alipay.trade.query',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: now.toISOString().split('T')[0] + ' ' + now.toTimeString().split(' ')[0],
      version: '1.0',
      biz_content: bizContent,
    };

    const queryString = new URLSearchParams(params).toString();
    const sign = this.generateRSA2Sign(queryString, alipayPrivateKey);
    params.sign = sign;

    logMonitor('PAYMENTS', 'INFO', {
      action: 'ALIPAY_QUERY_REQUEST',
      outTradeNo,
      tradeNo,
    });

    const response = await fetch(alipayGateway, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });

    const responseText = await response.text();
    const responseParams = new URLSearchParams(responseText);
    const responseJson = responseParams.get('alipay_trade_query_response');

    if (!responseJson) {
      logMonitor('PAYMENTS', 'ERROR', {
        action: 'ALIPAY_QUERY_FAILED',
        outTradeNo,
        tradeNo,
        responseText: responseText.substring(0, 200),
      });
      throw new Error('Alipay query response missing alipay_trade_query_response');
    }

    const queryResult = JSON.parse(responseJson);

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'ALIPAY_QUERY_RESULT',
      outTradeNo,
      tradeNo,
      tradeStatus: queryResult.trade_status,
      totalAmount: queryResult.total_amount,
    });

    return {
      trade_status: queryResult.trade_status || '',
      total_amount: queryResult.total_amount || '0',
      out_trade_no: queryResult.out_trade_no || '',
      trade_no: queryResult.trade_no || '',
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
