import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { PaymentService } from '@/lib/payment/PaymentService';
import { logMonitor } from '@/lib/utils/logger';
import { resolvePaymentError } from '@/lib/payment/errorCodeMapper';

const PAYPAL_API_BASE_SANDBOX = 'https://api-m.sandbox.paypal.com';
const PAYPAL_API_BASE_LIVE = 'https://api-m.paypal.com';

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

function getPayPalConfig() {
  const config = PaymentService.getConfig('paypal');
  if (!config) {
    throw new Error('PayPal configuration not found');
  }
  const configJson = JSON.parse(config.config_json || '{}');
  return {
    clientId: configJson.client_id || '',
    clientSecret: configJson.client_secret || '',
    isSandbox: config.is_sandbox,
    apiBase: config.is_sandbox ? PAYPAL_API_BASE_SANDBOX : PAYPAL_API_BASE_LIVE
  };
}

async function getAccessToken(): Promise<string> {
  const config = getPayPalConfig();
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch(`${config.apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    logMonitor('PAYMENTS', 'ERROR', {
      action: 'PAYPAL_AUTH_FAILED',
      status: response.status
    });
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

function sanitizeProductName(name: string): string {
  return name
    .replace(/[^\x00-\x7F]/g, '')
    .substring(0, 127);
}

async function createPayPalOrder(accessToken: string, orderData: any): Promise<any> {
  const config = getPayPalConfig();
  
  logMonitor('PAYMENTS', 'INFO', {
    action: 'PAYPAL_SENDING_REQUEST',
    url: `${config.apiBase}/v2/checkout/orders`,
    requestBody: JSON.stringify(orderData, null, 2)
  });

  const response = await fetch(`${config.apiBase}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
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
      httpStatus: response.status,
      errorName: errorData.name,
      errorMessage: errorData.message,
      errorDetails: errorData.details,
      fullResponse: errorData
    });

    throw {
      status: response.status,
      error: errorData
    };
  }

  const jsonData = JSON.parse(responseText);
  logMonitor('PAYMENTS', 'SUCCESS', {
    action: 'PAYPAL_ORDER_CREATED',
    paypalOrderId: jsonData.id,
    status: jsonData.status
  });

  return jsonData;
}

export async function POST(req: NextRequest) {
  const lang = getLangFromRequest(req);

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'POST',
    path: '/api/payments/paypal',
    lang
  });

  try {
    await PaymentService.initialize();

    const body = await req.json();
    const { order_number, currency = 'USD' } = body;

    if (!order_number) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        reason: 'Missing order_number'
      });
      return NextResponse.json({
        success: false,
        error: 'MISSING_ORDER_NUMBER',
        message: '缺少订单号 order_number'
      }, { status: 400 });
    }

    const orderResult = await query(
      `SELECT id, order_number, final_amount, shipping_fee,
              total_original_price, order_final_discount_amount,
              total_coupon_discount, order_status, payment_method
       FROM orders WHERE order_number = ?`,
      [order_number]
    );

    if (orderResult.rows.length === 0) {
      logMonitor('PAYMENTS', 'NOT_FOUND', { order_number });
      return NextResponse.json({
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: '订单不存在'
      }, { status: 404 });
    }

    const order = orderResult.rows[0];

    if (order.order_status !== 'pending') {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        reason: 'Order not in pending status',
        orderStatus: order.order_status
      });
      return NextResponse.json({
        success: false,
        error: 'ORDER_STATUS_INVALID',
        message: '订单状态不允许支付'
      }, { status: 400 });
    }

    const itemsResult = await query(
      `SELECT oi.product_id, p.name as product_name, oi.quantity, oi.original_price
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    if (itemsResult.rows.length === 0) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        reason: 'Order has no items',
        orderId: order.id
      });
      return NextResponse.json({
        success: false,
        error: 'ORDER_EMPTY',
        message: '订单无商品'
      }, { status: 400 });
    }

    const finalAmount = parseFloat(order.final_amount) || 0;
    const shippingFee = parseFloat(order.shipping_fee) || 0;
    const itemTotal = parseFloat(order.total_original_price) || 0;
    const discountAmount = parseFloat(order.order_final_discount_amount) || 0;

    const paypalItems = itemsResult.rows.map((item: any) => ({
      name: sanitizeProductName(item.product_name) || `Product ${item.product_id}`,
      unit_amount: {
        currency_code: currency,
        value: parseFloat(parseFloat(item.original_price).toFixed(2)),
      },
      quantity: String(item.quantity),
      category: 'PHYSICAL_GOODS',
    }));

    logMonitor('PAYMENTS', 'INFO', {
      action: 'PAYPAL_BUILDING_ORDER',
      order_number,
      orderId: order.id,
      finalAmount,
      shippingFee,
      itemTotal,
      discountAmount,
      itemsCount: paypalItems.length
    });

    const accessToken = await getAccessToken();

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
      intent: 'CAPTURE',
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

    const paypalResponse = await createPayPalOrder(accessToken, paypalOrderData);

    const approvalUrl = paypalResponse.links?.find((link: any) => link.rel === 'approve')?.href;

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'PAYPAL_READY_TO_REDIRECT',
      order_number,
      paypalOrderId: paypalResponse.id,
      approvalUrl: approvalUrl ? 'present' : 'missing'
    });

    return NextResponse.json({
      success: true,
      data: {
        payment_id: paypalResponse.id,
        redirect_url: approvalUrl
      }
    });

  } catch (error: any) {
    logMonitor('PAYMENTS', 'ERROR', {
      action: 'PAYPAL_PAYMENT_ERROR',
      error: String(error)
    });

    const resolved = await resolvePaymentError({
      platform: 'paypal',
      lang: (lang as any) || 'zh',
      httpStatus: error?.status,
      name: error?.error?.name,
      issues: Array.isArray(error?.error?.details)
        ? error.error.details.map((d: any) => ({ issue: d.issue, description: d.description }))
        : [],
      messageEn: error?.error?.message || error?.message
    });

    logMonitor('PAYMENTS', 'ERROR', {
      action: 'PAYPAL_ERROR_INFO',
      originalCode: resolved.originalCode,
      unifiedCode: resolved.unifiedCode,
      errorType: resolved.errorType,
      message: resolved.message
    });

    return NextResponse.json({
      success: false,
      error: resolved.unifiedCode,
      error_type: resolved.errorType,
      message: resolved.message
    }, { status: error.status || 500 });
  }
}
