import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
import { getPaymentErrorMapping } from '@/lib/payment/errorCodeMapper';
import { completeRefundSuccess } from '@/lib/refund-completion-service';
import {
  markRefundWebhookEventCompleted,
  markRefundWebhookEventFailed,
  normalizeAlipayRefundWebhook,
  registerRefundWebhookEvent,
  validateAlipayWebhookSource,
  validateRefundWebhookAmount,
} from '@/lib/payment/refund-webhook-service';

/**
 * ============================================================
 * Alipay 支付异步通知接口
 * ============================================================
 *
 * @api {POST} /api/payments/alipay/notify Alipay 支付异步通知
 * @apiName AlipayNotify
 * @apiGroup Payments
 * @apiDescription 处理支付宝异步通知，验证签名并更新支付状态
 *
 * **业务逻辑：**
 * 1. 接收支付宝 POST 通知
 * 2. 验证通知参数完整性
 * 3. 根据 out_trade_no 查询订单
 * 4. 记录支付日志到 payment_logs 表
 * 5. 返回 success/fail 给支付宝
 *
 * **注意：**
 * - 当前为开发/测试版，签名验证待支付宝公钥配置后增强
 * - 订单状态更新由前端 success 页面调用 /api/payments/result 统一处理
 * - notify 接口只做验证和日志记录
 *
 * @apiParam {String} out_trade_no 商户订单号
 * @apiParam {String} trade_no 支付宝交易号
 * @apiParam {String} trade_status 交易状态
 * @apiParam {String} total_amount 支付金额
 *
 * @apiSuccess {String} success 成功返回字符串 "success"
 * @apiError {String} fail 失败返回字符串 "fail"
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

async function getAlipayErrorMessage(errorCode: string, lang: string): Promise<string> {
  const mapping = await getPaymentErrorMapping('alipay', errorCode);
  if (!mapping) {
    return lang === 'zh' ? '支付失败，请稍后重试' :
           lang === 'ar' ? 'فشل الدفع، يرجى المحاولة لاحقًا' :
           'Payment failed, please retry later';
  }

  return lang === 'zh'
    ? (mapping.messageZh || mapping.messageEn || mapping.messageAr || mapping.originalCode)
    : lang === 'ar'
      ? (mapping.messageAr || mapping.messageEn || mapping.messageZh || mapping.originalCode)
      : (mapping.messageEn || mapping.messageZh || mapping.messageAr || mapping.originalCode);
}

async function saveAlipayLog(
  orderId: number,
  orderNumber: string,
  alipayTradeNo: string,
  tradeStatus: string,
  totalAmount: number,
  rawResponse: string,
  isSuccess: boolean,
  errorCode: string | null = null,
  errorMessage: string | null = null
) {
  await query(
    `INSERT INTO payment_logs 
     (order_id, order_number, payment_method, platform_order_id, status, error_code, error_message, raw_response, is_success, amount, currency, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      orderId,
      orderNumber,
      'alipay',
      alipayTradeNo,
      tradeStatus,
      errorCode,
      errorMessage,
      rawResponse,
      isSuccess ? 1 : 0,
      totalAmount,
      'CNY'
    ]
  );
}

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'POST',
    path: '/api/payments/alipay/notify',
    lang
  });

  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = String(value);
    });

    const refundWebhook = normalizeAlipayRefundWebhook(params);
    if (refundWebhook.isRefundSuccess) {
      const sourceValidation = validateAlipayWebhookSource(params);
      if (!sourceValidation.success) {
        logMonitor('PAYMENTS', 'ERROR', {
          action: 'ALIPAY_REFUND_WEBHOOK_SOURCE_INVALID',
          eventId: refundWebhook.eventId,
          error: sourceValidation.error,
        });
        return NextResponse.json({
          success: false,
          error: sourceValidation.error,
        }, { status: 400 });
      }

      const webhookEvent = await registerRefundWebhookEvent('alipay', refundWebhook, params, 'refund_success');
      if (webhookEvent.duplicate) {
        logMonitor('PAYMENTS', 'SUCCESS', {
          action: 'ALIPAY_REFUND_WEBHOOK_ALREADY_PROCESSED',
          eventId: webhookEvent.eventId,
          status: webhookEvent.status,
        });
        return NextResponse.json('success');
      }

      const amountValidation = await validateRefundWebhookAmount(refundWebhook, 'alipay');
      if (!amountValidation.success) {
        await markRefundWebhookEventFailed('alipay', webhookEvent.eventId, amountValidation.error || 'REFUND_WEBHOOK_INVALID');
        logMonitor('PAYMENTS', 'ERROR', {
          action: 'ALIPAY_REFUND_WEBHOOK_INVALID',
          eventId: refundWebhook.eventId,
          order_number: refundWebhook.orderNumber,
          referenceId: refundWebhook.referenceId,
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
        platform: 'alipay',
        transactionId: refundWebhook.transactionId,
        reason: 'Alipay 退款成功回调',
      });

      if (!refundResult.success) {
        await markRefundWebhookEventFailed('alipay', webhookEvent.eventId, refundResult.error || 'REFUND_SUCCESS_FAILED', 'refund_completion');
        logMonitor('PAYMENTS', 'ERROR', {
          action: 'ALIPAY_REFUND_SUCCESS_FAILED',
          out_trade_no: refundWebhook.orderNumber,
          trade_no: refundWebhook.referenceId,
          refund_id: refundWebhook.transactionId,
          eventId: refundWebhook.eventId,
          error: refundResult.error,
          orderStatus: refundResult.orderStatus,
        });
        return NextResponse.json('fail', { status: refundResult.error === 'ORDER_NOT_FOUND' ? 404 : 400 });
      }

      await markRefundWebhookEventCompleted('alipay', webhookEvent.eventId);

      logMonitor('PAYMENTS', 'SUCCESS', {
        action: 'ALIPAY_REFUND_SUCCESS',
        orderId: refundResult.orderId,
        orderNumber: refundResult.orderNumber,
        tradeNo: refundWebhook.referenceId,
        refund_id: refundWebhook.transactionId,
        eventId: refundWebhook.eventId,
        alreadyCompleted: refundResult.alreadyCompleted,
      });

      return NextResponse.json('success');
    }

    const outTradeNo = params['out_trade_no'];
    const tradeStatus = params['trade_status'];
    const totalAmount = params['total_amount'];
    const tradeNo = params['trade_no'];

    if (!outTradeNo || !tradeStatus || !tradeNo) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        reason: 'Missing required Alipay notify params',
        outTradeNo,
        tradeStatus,
        tradeNo
      });
      return NextResponse.json('fail', { status: 400 });
    }

    const orderResult = await query(
      'SELECT id, user_id, order_number, final_amount, payment_status, order_status FROM orders WHERE order_number = ?',
      [outTradeNo]
    );

    if (orderResult.rows.length === 0) {
      logMonitor('PAYMENTS', 'NOT_FOUND', {
        action: 'ALIPAY_NOTIFY_ORDER_NOT_FOUND',
        orderNumber: outTradeNo,
        tradeNo
      });
      return NextResponse.json('fail', { status: 404 });
    }

    const order = orderResult.rows[0];
    const notifyAmount = parseFloat(totalAmount || '0');
    const orderAmount = parseFloat(order.final_amount || '0');

    if (Math.abs(notifyAmount - orderAmount) > 0.01) {
      const errorMessage = await getAlipayErrorMessage('AMOUNT_MISMATCH', lang);
      await saveAlipayLog(
        order.id,
        outTradeNo,
        tradeNo,
        tradeStatus,
        notifyAmount,
        JSON.stringify(params),
        false,
        'AMOUNT_MISMATCH',
        errorMessage
      );

      logMonitor('PAYMENTS', 'ERROR', {
        action: 'ALIPAY_NOTIFY_AMOUNT_MISMATCH',
        orderId: order.id,
        orderNumber: outTradeNo,
        tradeNo,
        notifyAmount,
        orderAmount
      });

      return NextResponse.json('fail', { status: 400 });
    }

    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      await saveAlipayLog(
        order.id,
        outTradeNo,
        tradeNo,
        tradeStatus,
        notifyAmount,
        JSON.stringify(params),
        true
      );

      logMonitor('PAYMENTS', 'SUCCESS', {
        action: 'ALIPAY_NOTIFY_VERIFIED',
        orderId: order.id,
        orderNumber: outTradeNo,
        tradeStatus,
        tradeNo
      });
      return NextResponse.json('success');
    }

    const pendingMessage = await getAlipayErrorMessage(tradeStatus, lang);
    await saveAlipayLog(
      order.id,
      outTradeNo,
      tradeNo,
      tradeStatus,
      notifyAmount,
      JSON.stringify(params),
      false,
      tradeStatus,
      pendingMessage
    );

    logMonitor('PAYMENTS', 'ERROR', {
      action: 'ALIPAY_NOTIFY_INVALID_STATUS',
      orderId: order.id,
      orderNumber: outTradeNo,
      tradeStatus,
      tradeNo
    });

    return NextResponse.json('fail', { status: 400 });
  } catch (error) {
    logMonitor('PAYMENTS', 'ERROR', {
      action: 'ALIPAY_NOTIFY_ERROR',
      error: String(error)
    });
    return NextResponse.json('fail', { status: 500 });
  }
}
