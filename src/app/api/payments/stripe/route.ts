// src/app/api/payments/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logMonitor } from '@/lib/utils/logger';
import { getPaymentOrderData, PaymentDataError } from '@/lib/payment/order-data-service';
import { StripeAdapter } from '@/lib/payment/stripe-adapter';

const stripeAdapter = new StripeAdapter();

/**
 * POST /api/payments/stripe - 创建 Stripe Checkout Session
 *
 * 前端只传 order_number，金额和商品从 DB 读取
 */
export async function POST(request: NextRequest) {
  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'POST',
    path: '/api/payments/stripe',
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

    const orderData = await getPaymentOrderData(order_number, 'stripe');

    const result = await stripeAdapter.createPayment(orderData, {
      order_number,
      source,
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
        action: 'STRIPE_CREATE',
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
      action: 'STRIPE_PAYMENT',
      error: String(error),
    });
    return NextResponse.json({
      success: false,
      error: 'PAYMENT_CREATION_FAILED',
    }, { status: 500 });
  }
}
