import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const EXCHANGE_RATES = {
  aed: 1,
  usd: 0.2722,
  cny: 1.9558
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = parseInt(searchParams.get('order_id') || '0', 10);
    const amount = searchParams.get('amount');
    const currency = searchParams.get('currency') || 'CNY';
    const order_number = searchParams.get('order_number');

    if (!orderId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing order_id or amount' },
        { status: 400 }
      );
    }

    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const orderResult = await query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, authResult.user.userId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    if (order.payment_method !== 'alipay') {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method for this order' },
        { status: 400 }
      );
    }

    const alipayPartner = process.env.ALIPAY_PARTNER_ID;
    const alipaySellerId = process.env.ALIPAY_SELLER_ID;
    const alipayPrivateKey = process.env.ALIPAY_PRIVATE_KEY;
    const alipayGateway = process.env.ALIPAY_GATEWAY_URL || 'https://openapi.alipaydev.com/gateway.do';

    if (!alipayPartner || !alipaySellerId || !alipayPrivateKey) {
      const mockPaymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/cart/success?order_number=${order_number}&payment_method=alipay`;

      return NextResponse.redirect(mockPaymentUrl);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const bizContent = {
      out_trade_no: order_number,
      total_amount: amount,
      subject: `Order Payment - ${order_number}`,
      product_code: 'FAST_INSTANT_TRADE_PAY'
    };

    const bizContentStr = JSON.stringify(bizContent);

    const params: Record<string, string> = {
      app_id: process.env.ALIPAY_APP_ID || '',
      method: 'alipay.trade.page.pay',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
      version: '1.0',
      notify_url: `${baseUrl}/api/payments/alipay/notify`,
      return_url: `${baseUrl}/cart/success?order_number=${order_number}&trade_no={TRADE_NO}`,
      biz_content: bizContentStr
    };

    const queryString = new URLSearchParams(params).toString();

    const sign = generateRSA2Sign(queryString, alipayPrivateKey);
    params.sign = sign;

    const paymentUrl = `${alipayGateway}?${new URLSearchParams(params).toString()}`;

    return NextResponse.redirect(paymentUrl);

  } catch (error) {
    console.error('Error in Alipay payment API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process Alipay payment' },
      { status: 500 }
    );
  }
}

function generateRSA2Sign(content: string, privateKey: string): string {
  const crypto = require('crypto');
  const sign = crypto.sign('RSA-SHA256', Buffer.from(content), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  });
  return sign.toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, amount, currency, order_number } = body;

    if (!order_id || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing order_id or amount' },
        { status: 400 }
      );
    }

    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const orderResult = await query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [order_id, authResult.user.userId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    return NextResponse.json({
      success: true,
      data: {
        order_id,
        order_number,
        payment_method: 'alipay',
        amount,
        currency,
        payment_url: `${baseUrl}/api/payments/alipay?order_id=${order_id}&amount=${amount}&currency=${currency}&order_number=${order_number}`,
        qr_code_url: `${baseUrl}/api/payments/alipay/qrcode?order_id=${order_id}&amount=${amount}&currency=${currency}&order_number=${order_number}`
      }
    });

  } catch (error) {
    console.error('Error in Alipay payment API (POST):', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process Alipay payment' },
      { status: 500 }
    );
  }
}