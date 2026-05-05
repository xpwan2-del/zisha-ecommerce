// src/app/api/payments/paypal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logMonitor } from '@/lib/utils/logger';
import { resolvePaymentError } from '@/lib/payment/errorCodeMapper';
import { getPaymentOrderData, PaymentDataError } from '@/lib/payment/order-data-service';
import { PayPalAdapter } from '@/lib/payment/paypal-adapter';

const paypalAdapter = new PayPalAdapter();

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

/**
 * POST /api/payments/paypal - 创建 PayPal 支付订单
 *
 * 前端只传 order_number，金额和商品从 DB 读取
 */
export async function POST(req: NextRequest) {
  const lang = getLangFromRequest(req);

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'POST',
    path: '/api/payments/paypal',
    lang,
  });

  try {
    const body = await req.json();
    const { order_number, currency = 'USD' } = body;

    if (!order_number) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', { reason: 'Missing order_number' });
      return NextResponse.json({
        success: false,
        error: 'MISSING_ORDER_NUMBER',
      }, { status: 400 });
    }

    const orderData = await getPaymentOrderData(order_number, 'paypal');

    const result = await paypalAdapter.createPayment(orderData, {
      order_number,
      currency,
      lang,
    });

    return NextResponse.json({
      success: true,
      data: {
        payment_id: result.paymentId,
        redirect_url: result.redirectUrl,
      },
    });

  } catch (error: any) {
    if (error instanceof PaymentDataError) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({
        success: false,
        error: error.code,
        message: error.message,
      }, { status: error.status });
    }

    logMonitor('PAYMENTS', 'ERROR', {
      action: 'PAYPAL_PAYMENT_ERROR',
      error: String(error),
    });

    const resolved = await resolvePaymentError({
      platform: 'paypal',
      lang: (lang as any) || 'zh',
      httpStatus: error?.status,
      name: error?.error?.name,
      issues: Array.isArray(error?.error?.details)
        ? error.error.details.map((d: any) => ({ issue: d.issue, description: d.description }))
        : [],
      messageEn: error?.error?.message || error?.message,
    });

    return NextResponse.json({
      success: false,
      error: resolved.unifiedCode,
      error_type: resolved.errorType,
      message: resolved.message,
    }, { status: error.status || 500 });
  }
}
