// src/app/api/payments/alipay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';
import { getPaymentOrderData, PaymentDataError } from '@/lib/payment/order-data-service';
import { AlipayAdapter } from '@/lib/payment/alipay-adapter';

const alipayAdapter = new AlipayAdapter();

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

/**
 * GET /api/payments/alipay - 创建支付宝支付（重定向模式）
 *
 * 前端跳转：GET /api/payments/alipay?order_number=xxx&source=cart
 * 后端从 DB 获取订单 final_amount，构造支付宝支付 URL 并 302 跳转
 */
export async function GET(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'GET',
    path: '/api/payments/alipay',
    lang,
  });

  try {
    const { searchParams } = new URL(request.url);
    const order_number = searchParams.get('order_number');
    const source = searchParams.get('source') || 'cart';

    if (!order_number) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', { reason: 'Missing order_number' });
      return NextResponse.json({
        success: false,
        error: 'MISSING_ORDER_NUMBER',
      }, { status: 400 });
    }

    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PAYMENTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const orderData = await getPaymentOrderData(order_number, 'alipay');

    const result = await alipayAdapter.createPayment(orderData, {
      order_number,
      source,
      lang,
    });

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'ALIPAY_REDIRECT',
      orderNumber: order_number,
      finalAmount: orderData.finalAmount,
    });

    return NextResponse.redirect(result.redirectUrl);

  } catch (error: any) {
    if (error instanceof PaymentDataError) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        action: 'ALIPAY_CREATE',
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
      action: 'ALIPAY_CREATE',
      error: String(error),
    });
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

/**
 * POST /api/payments/alipay - 创建支付宝支付（JSON 模式）
 *
 * 前端调用：POST /api/payments/alipay { order_number, source }
 * 后端从 DB 获取订单 final_amount，返回支付 URL 给前端自行跳转
 */
export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'POST',
    path: '/api/payments/alipay',
    lang,
  });

  try {
    const body = await request.json();
    const { order_number, source = 'cart' } = body;

    if (!order_number) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', { reason: 'Missing order_number' });
      return NextResponse.json({
        success: false,
        error: 'MISSING_ORDER_NUMBER',
      }, { status: 400 });
    }

    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PAYMENTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const orderData = await getPaymentOrderData(order_number, 'alipay');

    const result = await alipayAdapter.createPayment(orderData, {
      order_number,
      source,
      lang,
    });

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'ALIPAY_CREATED',
      orderNumber: order_number,
      finalAmount: orderData.finalAmount,
    });

    return NextResponse.json({
      success: true,
      data: {
        order_number,
        payment_method: 'alipay',
        payment_url: result.redirectUrl,
      },
    });

  } catch (error: any) {
    if (error instanceof PaymentDataError) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        action: 'ALIPAY_CREATE',
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
      action: 'ALIPAY_CREATE',
      error: String(error),
    });
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
