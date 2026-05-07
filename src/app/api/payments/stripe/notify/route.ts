import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {POST} /api/payments/stripe/notify Stripe 支付回调
 * @apiName StripeNotify
 * @apiGroup PAYMENTS
 * @apiDescription 接收 Stripe Webhook 支付结果通知。验签校验后返回结果，不写数据库，订单落单由 result 路由统一负责。
 */


const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20' as any,
}) : null;

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

async function getStripeErrorMessage(errorCode: string, lang: string): Promise<string> {
  const messages: Record<string, Record<string, string>> = {
    zh: {
      HTTP_404: '订单不存在',
      HTTP_401: '支付配置错误',
      AMOUNT_MISMATCH: '支付金额与订单金额不一致',
      ORDER_NUMBER_MISMATCH: '支付订单号不匹配',
      PAYMENT_ALREADY_PAID: '订单已支付',
      UNKNOWN_ERROR: '支付失败，请稍后重试'
    },
    en: {
      HTTP_404: 'Order not found',
      HTTP_401: 'Payment configuration error',
      AMOUNT_MISMATCH: 'Payment amount does not match order amount',
      ORDER_NUMBER_MISMATCH: 'Payment order number mismatch',
      PAYMENT_ALREADY_PAID: 'Order already paid',
      UNKNOWN_ERROR: 'Payment failed, please retry'
    },
    ar: {
      HTTP_404: 'الطلب غير موجود',
      HTTP_401: 'خطأ في تكوين الدفع',
      AMOUNT_MISMATCH: 'مبلغ الدفع لا يتطابق مع مبلغ الطلب',
      ORDER_NUMBER_MISMATCH: 'رقم طلب الدفع غير متطابق',
      PAYMENT_ALREADY_PAID: 'تم الدفع بالفعل',
      UNKNOWN_ERROR: 'فشل الدفع، يرجى المحاولة لاحقًا'
    }
  };

  return messages[lang]?.[errorCode] || messages['zh'][errorCode] || 'Unknown error';
}

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'POST',
    path: '/api/payments/stripe/notify',
    lang
  });

  try {
    if (!stripe) {
      logMonitor('PAYMENTS', 'ERROR', {
        action: 'STRIPE_CONFIG_ERROR',
        error: 'Stripe is not configured'
      });
      return NextResponse.json({
        success: false,
        error: 'STRIPE_NOT_CONFIGURED',
        message: await getStripeErrorMessage('HTTP_401', lang)
      }, { status: 500 });
    }

    const body = await request.json();
    const { session_id, order_number } = body;

    if (!session_id) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        reason: 'Missing session_id'
      });
      return NextResponse.json({
        success: false,
        error: 'MISSING_PARAMS',
        message: await getStripeErrorMessage('MISSING_PARAMS', lang)
      }, { status: 400 });
    }

    logMonitor('PAYMENTS', 'INFO', {
      action: 'VERIFY_STRIPE_SESSION',
      session_id,
      order_number
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session || session.payment_status !== 'paid') {
      logMonitor('PAYMENTS', 'PAYMENT_FAILED', {
        action: 'STRIPE_NOT_PAID',
        session_id,
        payment_status: session?.payment_status
      });
      return NextResponse.json({
        success: false,
        error: 'PAYMENT_NOT_COMPLETED',
        message: await getStripeErrorMessage('UNKNOWN_ERROR', lang)
      }, { status: 400 });
    }

    const stripeOrderNumber = order_number || session.metadata?.order_number;

    if (!stripeOrderNumber) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        reason: 'Missing order_number in session metadata'
      });
      return NextResponse.json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'Missing order_number'
      }, { status: 400 });
    }

    if (order_number && session.metadata?.order_number && session.metadata.order_number !== order_number) {
      logMonitor('PAYMENTS', 'AUTH_FAILED', {
        action: 'STRIPE_ORDER_NUMBER_MISMATCH',
        session_id,
        provided_order_number: order_number,
        session_order_number: session.metadata.order_number
      });
      return NextResponse.json({
        success: false,
        error: 'ORDER_NUMBER_MISMATCH',
        message: await getStripeErrorMessage('ORDER_NUMBER_MISMATCH', lang)
      }, { status: 403 });
    }

    const orderResult = await query(
      'SELECT id, user_id, order_number, final_amount, payment_status, order_status FROM orders WHERE order_number = ?',
      [stripeOrderNumber]
    );

    if (orderResult.rows.length === 0) {
      logMonitor('PAYMENTS', 'NOT_FOUND', {
        reason: 'Order not found',
        order_number: stripeOrderNumber
      });
      return NextResponse.json({
        success: false,
        error: 'HTTP_404',
        message: await getStripeErrorMessage('HTTP_404', lang)
      }, { status: 404 });
    }

    const order = orderResult.rows[0];

    if (order.payment_status === 'paid') {
      logMonitor('PAYMENTS', 'SUCCESS', {
        action: 'PAYMENT_ALREADY_PAID',
        orderId: order.id,
        order_number: stripeOrderNumber
      });
      return NextResponse.json({
        success: true,
        status: 'already_paid',
        message: '订单已支付'
      });
    }

    const paidAmount = (session.amount_total || 0) / 100;
    const orderAmount = parseFloat(order.final_amount);

    if (Math.abs(paidAmount - orderAmount) > 0.01) {
      logMonitor('PAYMENTS', 'ERROR', {
        action: 'AMOUNT_MISMATCH_BLOCKED',
        orderId: order.id,
        order_number: stripeOrderNumber,
        paidAmount,
        orderAmount,
        difference: Math.abs(paidAmount - orderAmount)
      });

      try {
        await query(
          `INSERT INTO payment_logs
           (order_id, order_number, payment_method, status, error_code, error_message, is_success,
            transaction_id, platform_order_id, payment_stage, amount, currency, extra_data, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            order.id, stripeOrderNumber, 'stripe', 'failed',
            'AMOUNT_MISMATCH', `Paid: ${paidAmount}, Expected: ${orderAmount}`, 0,
            session.payment_intent || session_id, session_id, 'notify',
            paidAmount, (session.currency || 'usd').toUpperCase(),
            JSON.stringify({ difference: Math.abs(paidAmount - orderAmount) })
          ]
        );
      } catch (_logErr) {}

      if (session.payment_intent) {
        try {
          await stripe.refunds.create({ payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any).id });
          logMonitor('PAYMENTS', 'SUCCESS', {
            action: 'AMOUNT_MISMATCH_REFUNDED',
            orderId: order.id,
            order_number: stripeOrderNumber,
            paymentIntent: session.payment_intent
          });
        } catch (_refundErr) {
          logMonitor('PAYMENTS', 'ERROR', {
            action: 'AMOUNT_MISMATCH_REFUND_FAILED',
            orderId: order.id,
            order_number: stripeOrderNumber,
            paymentIntent: session.payment_intent,
            error: String(_refundErr)
          });
        }
      }

      return NextResponse.json({
        success: false,
        error: 'AMOUNT_MISMATCH',
        message: await getStripeErrorMessage('AMOUNT_MISMATCH', lang)
      }, { status: 400 });
    }

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'PAYMENT_SUCCESS',
      orderId: order.id,
      order_number: stripeOrderNumber,
      paidAmount
    });

    return NextResponse.json({
      success: true,
      status: 'captured',
      payment_id: session.payment_intent || session_id
    });

  } catch (error: any) {
    logMonitor('PAYMENTS', 'ERROR', {
      action: 'STRIPE_NOTIFY_ERROR',
      error: String(error)
    });

    return NextResponse.json({
      success: false,
      error: 'UNKNOWN_ERROR',
      message: await getStripeErrorMessage('UNKNOWN_ERROR', lang)
    }, { status: 500 });
  }
}
