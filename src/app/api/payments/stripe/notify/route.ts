import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
import { completeRefundSuccess } from '@/lib/refund-completion-service';
import {
  markRefundWebhookEventCompleted,
  markRefundWebhookEventFailed,
  normalizeStripeRefundWebhook,
  registerRefundWebhookEvent,
  validateRefundWebhookAmount,
} from '@/lib/payment/refund-webhook-service';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any })
  : null;

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') || request.cookies.get('locale')?.value || 'zh';
}

async function getStripeErrorMessage(errorCode: string, lang: string): Promise<string> {
  const messages: Record<string, Record<string, string>> = {
    zh: {
      HTTP_404: '订单不存在',
      HTTP_401: '支付配置错误',
      AMOUNT_MISMATCH: '支付金额与订单金额不一致',
      ORDER_NUMBER_MISMATCH: '支付订单号不匹配',
      PAYMENT_ALREADY_PAID: '订单已支付',
      MISSING_PARAMS: '缺少必要参数',
      UNKNOWN_ERROR: '支付失败，请稍后重试',
      PAYMENT_NOT_COMPLETED: '支付尚未完成'
    },
    en: {
      HTTP_404: 'Order not found',
      HTTP_401: 'Payment configuration error',
      AMOUNT_MISMATCH: 'Payment amount does not match order amount',
      ORDER_NUMBER_MISMATCH: 'Payment order number mismatch',
      PAYMENT_ALREADY_PAID: 'Order already paid',
      MISSING_PARAMS: 'Missing required parameters',
      UNKNOWN_ERROR: 'Payment failed, please retry',
      PAYMENT_NOT_COMPLETED: 'Payment is not completed'
    },
    ar: {
      HTTP_404: 'الطلب غير موجود',
      HTTP_401: 'خطأ في تكوين الدفع',
      AMOUNT_MISMATCH: 'مبلغ الدفع لا يتطابق مع مبلغ الطلب',
      ORDER_NUMBER_MISMATCH: 'رقم طلب الدفع غير متطابق',
      PAYMENT_ALREADY_PAID: 'تم الدفع بالفعل',
      MISSING_PARAMS: 'معاملات مفقودة',
      UNKNOWN_ERROR: 'فشل الدفع، يرجى المحاولة لاحقًا',
      PAYMENT_NOT_COMPLETED: 'الدفع غير مكتمل'
    }
  };

  return messages[lang]?.[errorCode] || messages.zh[errorCode] || messages.zh.UNKNOWN_ERROR;
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
    const refundWebhook = normalizeStripeRefundWebhook(body);
    const { session_id, order_number } = body;

    if (refundWebhook.isRefundSuccess) {
      const webhookEvent = await registerRefundWebhookEvent('stripe', refundWebhook, body, 'refund_success');
      if (webhookEvent.duplicate) {
        logMonitor('PAYMENTS', 'SUCCESS', {
          action: 'STRIPE_REFUND_WEBHOOK_ALREADY_PROCESSED',
          eventId: webhookEvent.eventId,
          status: webhookEvent.status,
        });
        return NextResponse.json({
          success: true,
          status: 'already_processed',
          eventId: webhookEvent.eventId,
        });
      }

      const amountValidation = await validateRefundWebhookAmount(refundWebhook, 'stripe');
      if (!amountValidation.success) {
        await markRefundWebhookEventFailed('stripe', webhookEvent.eventId, amountValidation.error || 'REFUND_WEBHOOK_INVALID');
        logMonitor('PAYMENTS', 'ERROR', {
          action: 'STRIPE_REFUND_WEBHOOK_INVALID',
          eventId: refundWebhook.eventId,
          order_number: refundWebhook.orderNumber,
          payment_intent: refundWebhook.referenceId,
          refund_id: refundWebhook.transactionId,
          error: amountValidation.error,
          refundAmount: refundWebhook.refundAmount,
          orderAmount: amountValidation.orderAmount,
        });
        return NextResponse.json({
          success: false,
          error: amountValidation.error || 'REFUND_WEBHOOK_INVALID',
        }, { status: amountValidation.error === 'ORDER_NOT_FOUND' ? 404 : 400 });
      }

      const refundResult = await completeRefundSuccess({
        orderNumber: refundWebhook.orderNumber || amountValidation.orderNumber || null,
        referenceId: refundWebhook.referenceId,
        platform: 'stripe',
        transactionId: refundWebhook.transactionId,
        reason: 'Stripe 退款成功回调',
      });

      if (!refundResult.success) {
        await markRefundWebhookEventFailed('stripe', webhookEvent.eventId, refundResult.error || 'REFUND_SUCCESS_FAILED', 'refund_completion');
        logMonitor('PAYMENTS', 'ERROR', {
          action: 'STRIPE_REFUND_SUCCESS_FAILED',
          order_number: refundWebhook.orderNumber,
          payment_intent: refundWebhook.referenceId,
          refund_id: refundWebhook.transactionId,
          error: refundResult.error,
          orderStatus: refundResult.orderStatus,
        });
        return NextResponse.json({
          success: false,
          error: refundResult.error || 'REFUND_SUCCESS_FAILED',
        }, { status: refundResult.error === 'ORDER_NOT_FOUND' ? 404 : 400 });
      }

      await markRefundWebhookEventCompleted('stripe', webhookEvent.eventId);

      logMonitor('PAYMENTS', 'SUCCESS', {
        action: 'STRIPE_REFUND_SUCCESS',
        orderId: refundResult.orderId,
        order_number: refundResult.orderNumber,
        refund_id: refundWebhook.transactionId,
        eventId: refundWebhook.eventId,
        alreadyCompleted: refundResult.alreadyCompleted,
      });

      return NextResponse.json({
        success: true,
        status: refundResult.alreadyCompleted ? 'already_refunded' : 'refund_completed',
        order_number: refundResult.orderNumber,
      });
    }

    if (!session_id || !order_number) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        reason: 'Missing session_id or order_number',
        session_id,
        order_number,
      });
      return NextResponse.json({
        success: false,
        error: 'MISSING_PARAMS',
        message: await getStripeErrorMessage('MISSING_PARAMS', lang)
      }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(String(session_id));
    const sessionOrderNumber = session.metadata?.order_number || '';

    if (sessionOrderNumber && sessionOrderNumber !== order_number) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        action: 'STRIPE_ORDER_NUMBER_MISMATCH',
        order_number,
        sessionOrderNumber,
        session_id,
      });
      return NextResponse.json({
        success: false,
        error: 'ORDER_NUMBER_MISMATCH',
        message: await getStripeErrorMessage('ORDER_NUMBER_MISMATCH', lang)
      }, { status: 400 });
    }

    let orderResult = await query(
      'SELECT id, user_id, order_number, final_amount, payment_status, order_status, reference_id FROM orders WHERE order_number = ?',
      [order_number]
    );

    if (orderResult.rows.length === 0 && session.payment_intent) {
      orderResult = await query(
        'SELECT id, user_id, order_number, final_amount, payment_status, order_status, reference_id FROM orders WHERE reference_id = ?',
        [String(session.payment_intent)]
      );
    }

    if (orderResult.rows.length === 0) {
      logMonitor('PAYMENTS', 'NOT_FOUND', {
        action: 'STRIPE_ORDER_NOT_FOUND',
        order_number,
        session_id,
        payment_intent: session.payment_intent,
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
        action: 'STRIPE_PAYMENT_ALREADY_PAID',
        orderId: order.id,
        order_number,
        session_id,
      });
      return NextResponse.json({
        success: true,
        status: 'already_paid',
        message: await getStripeErrorMessage('PAYMENT_ALREADY_PAID', lang)
      });
    }

    if (session.payment_status !== 'paid') {
      logMonitor('PAYMENTS', 'ERROR', {
        action: 'STRIPE_PAYMENT_NOT_COMPLETED',
        orderId: order.id,
        order_number,
        session_id,
        payment_status: session.payment_status,
      });
      return NextResponse.json({
        success: false,
        error: 'PAYMENT_NOT_COMPLETED',
        message: await getStripeErrorMessage('PAYMENT_NOT_COMPLETED', lang)
      }, { status: 400 });
    }

    const paidAmount = typeof session.amount_total === 'number' ? session.amount_total / 100 : 0;
    const orderAmount = parseFloat(order.final_amount || '0');
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

    if (Math.abs(paidAmount - orderAmount) > 0.01) {
      logMonitor('PAYMENTS', 'ERROR', {
        action: 'STRIPE_AMOUNT_MISMATCH',
        orderId: order.id,
        order_number,
        session_id,
        paymentIntentId,
        paidAmount,
        orderAmount,
      });

      if (paymentIntentId) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: 'requested_by_customer',
            metadata: {
              order_number: String(order.order_number),
              reason: 'amount_mismatch_auto_refund'
            }
          });

          logMonitor('PAYMENTS', 'SUCCESS', {
            action: 'STRIPE_AMOUNT_MISMATCH_REFUND_CREATED',
            orderId: order.id,
            order_number,
            refundId: refund.id,
            paymentIntentId,
          });
        } catch (refundError) {
          logMonitor('PAYMENTS', 'ERROR', {
            action: 'STRIPE_AMOUNT_MISMATCH_REFUND_FAILED',
            orderId: order.id,
            order_number,
            paymentIntentId,
            error: String(refundError),
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
      action: 'STRIPE_PAYMENT_VERIFIED',
      orderId: order.id,
      order_number,
      session_id,
      paymentIntentId,
      paidAmount,
    });

    return NextResponse.json({
      success: true,
      status: 'verified',
      payment_id: paymentIntentId || session.id,
      session_id: session.id,
      order_number: order.order_number,
    });
  } catch (error) {
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
