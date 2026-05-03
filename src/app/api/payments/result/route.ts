import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 统一支付结果回调 API
 * ============================================================
 *
 * @api {GET} /api/payments/result 统一支付结果回调
 * @apiName PaymentResult
 * @apiGroup Payments
 * @apiDescription 三个支付平台（PayPal/Alipay/Stripe）支付完成/取消后的统一回调入口。
 *
 * **业务逻辑：**
 * 1. 通过 order_number 查询本地订单
 * 2. 通过 status=cancel 判断是否为取消回调
 * 3. 通过 token/trade_no/session_id 参数自动识别支付平台
 * 4. 验证支付状态，记录日志，更新订单，重定向前端展示页
 *
 * @apiParam {String} order_number 订单号，必需
 * @apiParam {String} [source] 来源（quick-order|cart），默认 cart
 * @apiParam {String} [platform] 支付平台
 * @apiParam {String} [status] cancel 表示取消
 * @apiParam {String} [token] PayPal token
 * @apiParam {String} [PayerID] PayPal PayerID
 * @apiParam {String} [trade_no] Alipay trade_no
 * @apiParam {String} [session_id] Stripe session_id
 */

// ============================================================
// 辅助函数
// ============================================================

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

const PAYPAL_API_BASE_SANDBOX = 'https://api-m.sandbox.paypal.com';
const PAYPAL_API_BASE_LIVE = 'https://api-m.paypal.com';
/**
 * recordPaymentLog - 记录支付日志到 payment_logs 表
 */
async function recordPaymentLog(
  orderId: number, orderNumber: string, paymentMethod: string,
  status: string, errorCode: string | null, errorMessage: string | null,
  isSuccess: boolean, transactionId: string | null,
  platformOrderId: string | null, stage: string,
  amount: number, currency: string, extraData: any = {}
) {
  await query(
    `INSERT INTO payment_logs (
      order_id, order_number, payment_method, status,
      error_code, error_message, is_success,
      transaction_id, platform_order_id, payment_stage,
      amount, currency, extra_data, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      orderId, orderNumber, paymentMethod, status,
      errorCode, errorMessage, isSuccess ? 1 : 0,
      transactionId, platformOrderId, stage,
      amount, currency, JSON.stringify(extraData)
    ]
  );
}
// ============================================================
// GET - 统一支付结果回调
// ============================================================

export async function GET(request: NextRequest) {
  const lang = getLangFromRequest(request);
  const { searchParams } = request.nextUrl;
  const orderNumber = searchParams.get('order_number') || '';
  const source = searchParams.get('source') || 'cart';
  const platform = searchParams.get('platform') || '';
  const isCancel = searchParams.get('status') === 'cancel';
  const paypalToken = searchParams.get('token');
  const payerId = searchParams.get('PayerID');
  const tradeNo = searchParams.get('trade_no');
  const sessionId = searchParams.get('session_id');

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'GET',
    path: '/api/payments/result',
    query: { orderNumber, source, platform, isCancel,
      hasPayPalToken: !!paypalToken, hasTradeNo: !!tradeNo, hasSessionId: !!sessionId }
  });

  try {
    const orderResult = await query(
      'SELECT id, order_number, order_status, payment_status, payment_method, final_amount FROM orders WHERE order_number = ?',
      [orderNumber]
    );

    if (orderResult.rows.length === 0) {
      logMonitor('PAYMENTS', 'NOT_FOUND', { orderNumber });
      return NextResponse.redirect(new URL('/?error=order_not_found', request.url));
    }

    const order = orderResult.rows[0];
    const orderId = order.id;

    // === 处理取消 ===
    if (isCancel) {
      await recordPaymentLog(
        orderId, orderNumber, platform || order.payment_method,
        'cancelled', 'USER_CANCEL', 'User cancelled payment',
        false, null, orderNumber, 'cancel',
        order.final_amount || 0, 'USD',
        { source, platform, cancelled_at: new Date().toISOString() }
      );

      await query(
        'UPDATE orders SET order_status = ?, payment_status = ?, updated_at = datetime(\'now\') WHERE id = ?',
        ['cancelled', 'cancelled', orderId]
      );

      // 取消时立即归还库存
      const itemsResult = await query(
        `SELECT oi.product_id, oi.quantity, p.name
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [orderId]
      );
      const cancelTypeResult = await query(
        'SELECT id FROM transaction_type WHERE code = ?', ['sales_cancel']
      );
      const cancelTypeId = cancelTypeResult.rows[0]?.id || null;

      for (const item of itemsResult.rows) {
        const beforeResult = await query(
          'SELECT quantity FROM inventory WHERE product_id = ?', [item.product_id]
        );
        const beforeStock = beforeResult.rows[0]?.quantity || 0;

        await query(
          'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
          [item.quantity, item.product_id]
        );

        if (cancelTypeId) {
          await query(
            `INSERT INTO inventory_transactions (
              product_id, product_name, transaction_type_id, quantity_change,
              quantity_before, quantity_after, reason, reference_type, reference_id,
              operator_id, operator_name, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [item.product_id, item.name, cancelTypeId, item.quantity,
             beforeStock, beforeStock + item.quantity,
             '支付取消，归还库存', 'payment_cancel', orderId, null, 'SYSTEM']
          );
        }
      }

      logMonitor('PAYMENTS', 'SUCCESS', {
        action: 'PAYMENT_CANCELLED_WITH_INVENTORY_RETURN',
        orderId, orderNumber, platform, source,
        itemsReturned: itemsResult.rows.length
      });

      const redirectUrl = new URL('/payment-result', request.url);
      redirectUrl.searchParams.set('status', 'cancel');
      redirectUrl.searchParams.set('order_number', orderNumber);
      redirectUrl.searchParams.set('source', source);
      redirectUrl.searchParams.set('order_id', String(orderId));
      return NextResponse.redirect(redirectUrl);
    }

    // === 处理支付成功 ===
    const detectedPlatform = platform
      || (paypalToken ? 'paypal' : '')
      || (tradeNo ? 'alipay' : '')
      || (sessionId ? 'stripe' : '');

    let captureResult: any = null;
    let transactionId: string | null = null;
    let platformOrderId: string | null = null;

    if (detectedPlatform === 'paypal' && paypalToken) {
      platformOrderId = paypalToken;
      const configResult = await query(
        'SELECT is_sandbox, config_json FROM payment_config WHERE payment_method = ? AND is_enabled = 1',
        ['paypal']
      );
      if (configResult.rows.length === 0) {
        throw new Error('PayPal not configured');
      }
      const cfg = configResult.rows[0];
      const configJson = JSON.parse(cfg.config_json || '{}');
      const apiBase = cfg.is_sandbox ? PAYPAL_API_BASE_SANDBOX : PAYPAL_API_BASE_LIVE;
      const auth = Buffer.from(`${configJson.client_id}:${configJson.client_secret}`).toString('base64');
      const tokenResp = await fetch(`${apiBase}/v1/oauth2/token`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      });
      const tokenData = await tokenResp.json();
      const accessToken = tokenData.access_token;

      const capResp = await fetch(`${apiBase}/v2/checkout/orders/${paypalToken}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      captureResult = await capResp.json();

      if (captureResult.status !== 'COMPLETED') {
        throw new Error(`PayPal capture status: ${captureResult.status}`);
      }
      transactionId = captureResult?.purchase_units?.[0]?.payments?.captures?.[0]?.id || paypalToken;
    } else if (detectedPlatform === 'stripe' && sessionId) {
      platformOrderId = sessionId;
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) throw new Error('Stripe not configured');
      const StripeLib = require('stripe');
      const stripe = new StripeLib(stripeSecretKey, { apiVersion: '2024-06-20' });
      captureResult = await stripe.checkout.sessions.retrieve(sessionId);
      if (captureResult.payment_status !== 'paid') {
        throw new Error(`Stripe payment status: ${captureResult.payment_status}`);
      }
      transactionId = captureResult.payment_intent || '';
    } else if (detectedPlatform === 'alipay' && tradeNo) {
      platformOrderId = tradeNo;
      captureResult = { trade_no: tradeNo, status: 'TRADE_SUCCESS' };
      transactionId = tradeNo;
    } else {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        reason: 'Unknown platform or missing verification params',
        orderNumber, detectedPlatform
      });
      const redirectUrl = new URL('/payment-result', request.url);
      redirectUrl.searchParams.set('status', 'fail');
      redirectUrl.searchParams.set('order_number', orderNumber);
      redirectUrl.searchParams.set('source', source);
      redirectUrl.searchParams.set('error', encodeURIComponent('无法识别支付平台'));
      redirectUrl.searchParams.set('order_id', String(orderId));
      return NextResponse.redirect(redirectUrl);
    }
    // 记录支付成功日志
    await recordPaymentLog(
      orderId, orderNumber, detectedPlatform,
      'completed', null, null,
      true, transactionId, platformOrderId, 'callback',
      order.final_amount || 0, 'USD',
      { source, captureStatus: captureResult?.status || 'completed', payerId }
    );

    // 更新订单为已支付
    await query(
      'UPDATE orders SET order_status = ?, payment_status = ?, payment_method = ?, paid_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?',
      ['paid', 'paid', detectedPlatform, orderId]
    );

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'PAYMENT_SUCCESS',
      orderId, orderNumber, platform: detectedPlatform, transactionId, source
    });

    // 重定向到前端展示页
    const redirectUrl = new URL('/payment-result', request.url);
    redirectUrl.searchParams.set('status', 'success');
    redirectUrl.searchParams.set('order_number', orderNumber);
    redirectUrl.searchParams.set('source', source);
    redirectUrl.searchParams.set('platform', detectedPlatform);
    redirectUrl.searchParams.set('order_id', String(orderId));
    return NextResponse.redirect(redirectUrl);

  } catch (error: any) {
    logMonitor('PAYMENTS', 'ERROR', {
      action: 'PAYMENT_RESULT_ERROR',
      orderNumber,
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    const redirectUrl = new URL('/payment-result', request.url);
    redirectUrl.searchParams.set('status', 'fail');
    redirectUrl.searchParams.set('order_number', orderNumber);
    redirectUrl.searchParams.set('source', source);
    redirectUrl.searchParams.set('error', encodeURIComponent(String(error)));
    return NextResponse.redirect(redirectUrl);
  }
}
