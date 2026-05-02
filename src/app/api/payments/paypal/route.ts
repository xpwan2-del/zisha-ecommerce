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

async function calculateItemPrice(productId: number): Promise<number> {
  const productResult = await query(
    'SELECT price FROM product_prices WHERE product_id = ? AND currency = ?',
    [productId, 'USD']
  );

  if (productResult.rows?.length === 0) {
    throw new Error(`Product ${productId} not found`);
  }

  const originalPrice = parseFloat(productResult.rows[0].price) || 0;

  const promoResult = await query(
    `SELECT
      pr.discount_percent,
      pp.can_stack
    FROM product_promotions pp
    JOIN promotions pr ON pp.promotion_id = pr.id
    WHERE pp.product_id = ?
      AND datetime(pp.start_time) <= datetime('now')
      AND datetime(pp.end_time) >= datetime('now')`,
    [productId]
  );

  const promos = promoResult.rows || [];
  let finalPrice = originalPrice;

  if (promos.length > 0) {
    const exclusive = promos.find((p: any) => p.can_stack === 1);

    if (exclusive) {
      finalPrice = originalPrice * (1 - exclusive.discount_percent / 100);
    } else {
      let multiplier = 1;
      promos.forEach((p: any) => {
        multiplier *= (1 - p.discount_percent / 100);
      });
      finalPrice = originalPrice * multiplier;
    }
  }

  return finalPrice;
}

async function verifyPrices(items: any[]): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const item of items) {
    const price = await calculateItemPrice(item.product_id);
    const frontendPrice = parseFloat(item.price) || 0;

    if (Math.abs(price - frontendPrice) > 0.01) {
      errors.push(`Price mismatch for product ${item.product_id}: frontend=${frontendPrice}, calculated=${price}`);
    }
  }

  return { valid: errors.length === 0, errors };
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
    const { amount, currency = 'USD', items, order_number } = body;

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

    const { valid, errors } = await verifyPrices(items);
    if (!valid) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        reason: 'Price verification failed',
        errors
      });
      return NextResponse.json({
        success: false,
        error: 'PRICE_VERIFICATION_FAILED',
        message: '价格验证失败'
      }, { status: 400 });
    }

    const calculatedItems = await Promise.all(items.map(async (item: any) => {
      const price = await calculateItemPrice(item.product_id);
      return {
        name: sanitizeProductName(item.name) || `Product ${item.product_id}`,
        unit_amount: {
          currency_code: currency,
          value: parseFloat(price.toFixed(2)),
        },
        quantity: item.quantity.toString(),
        category: 'PHYSICAL_GOODS',
      };
    }));

    const verifiedAmount = calculatedItems.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.unit_amount.value) * parseInt(item.quantity, 10));
    }, 0);

    logMonitor('PAYMENTS', 'INFO', {
      action: 'PAYPAL_BUILDING_ORDER',
      order_number,
      currency,
      verifiedAmount,
      itemsCount: calculatedItems.length
    });

    const accessToken = await getAccessToken();

    const paypalOrderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: order_number,
        custom_id: order_number,
        amount: {
          currency_code: currency,
          value: parseFloat(verifiedAmount.toFixed(2)),
          breakdown: {
            item_total: {
              currency_code: currency,
              value: parseFloat(verifiedAmount.toFixed(2)),
            },
          },
        },
        items: calculatedItems,
      }],
      application_context: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/quick-order/success?order_number=${order_number}&source=quick-order`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/quick-order/success?order_number=${order_number}&source=cart`,
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
