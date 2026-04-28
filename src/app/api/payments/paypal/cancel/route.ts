import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * PayPal 支付取消处理
 * ============================================================
 *
 * @api {GET} /api/payments/paypal/cancel PayPal 取消回调
 * @apiName PayPalCancel
 * @apiGroup Payments
 * @apiDescription 处理 PayPal 用户取消支付，记录取消日志并返回订单详情页
 *
 * **业务逻辑：**
 * 1. 通过 token 参数获取订单号
 * 2. 查询本地订单信息
 * 3. 记录支付取消日志到 payment_logs 表
 * 4. 关联 payment_error_codes 表获取统一错误码
 * 5. 重定向到订单详情页
 *
 * **数据库关联：**
 * - payment_logs.error_code = payment_error_codes.original_code
 * - payment_logs.payment_method = payment_error_codes.platform
 *
 * @apiParam {String} token PayPal 返回的订单号（order_number）
 *
 * @apiSuccess {Number} orderId 订单ID
 * @apiSuccess {String} orderNumber 订单号
 * @apiSuccess {String} redirectUrl 重定向URL
 * @apiSuccess {Boolean} success 是否成功
 *
 * @apiError {String} ORDER_NOT_FOUND 订单不存在
 */

// ============================================================
// 辅助函数
// ============================================================

/**
 * getLangFromRequest - 从请求获取语言设置
 * @description 优先从请求头 x-lang 获取，其次从 cookie 获取，默认 zh
 */
function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

/**
 * createSuccessResponse - 创建统一成功响应
 * @param data 返回数据
 * @param status HTTP 状态码
 */
function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

// ============================================================
// 接口实现
// ============================================================

/**
 * GET - 处理 PayPal 支付取消
 *
 * @api {GET} /api/payments/paypal/cancel
 * @apiDescription PayPal 用户取消支付时回调此接口
 */
export async function GET(request: NextRequest) {
  const lang = getLangFromRequest(request);
  const searchParams = request.nextUrl.searchParams;
  const orderNumber = searchParams.get('token');

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'GET',
    path: '/api/payments/paypal/cancel',
    query: { orderNumber, token: orderNumber }
  });

  try {
    if (!orderNumber) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        action: 'PAYPAL_CANCEL',
        reason: 'Missing required param: token',
        query: Object.fromEntries(searchParams)
      });
      return NextResponse.redirect(new URL('/quick-order', request.url));
    }

    const orderResult = await query(
      'SELECT id, order_number, order_status, payment_status, final_amount FROM orders WHERE order_number = ?',
      [orderNumber]
    );

    if (orderResult.rows.length === 0) {
      logMonitor('PAYMENTS', 'NOT_FOUND', {
        action: 'PAYPAL_CANCEL',
        reason: 'Order not found',
        orderNumber
      });
      return NextResponse.redirect(new URL('/quick-order', request.url));
    }

    const order = orderResult.rows[0];

    const cancelParams = {
      payment_method: 'paypal',
      cancelled_at: new Date().toISOString(),
      platform: 'paypal',
      original_url: request.url,
      token: orderNumber
    };

    const paymentLogResult = await query(
      `INSERT INTO payment_logs (
        order_id, order_number, payment_method, status,
        error_code, error_message, raw_response, is_success,
        platform_order_id, payment_stage, extra_data,
        amount, currency, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        order.id,
        orderNumber,
        'paypal',
        'cancelled',
        'USER_CANCEL',
        null,
        JSON.stringify(cancelParams),
        false,
        orderNumber,
        'cancelled',
        JSON.stringify({
          payment_method: 'paypal',
          cancelled_at: new Date().toISOString(),
          platform: 'paypal',
          return_url: request.url
        }),
        order.final_amount,
        'USD'
      ]
    );

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'PAYPAL_CANCEL_LOGGED',
      orderId: order.id,
      orderNumber: order.order_number,
      paymentLogId: paymentLogResult.lastInsertRowid,
      errorCode: 'USER_CANCEL',
      status: 'cancelled',
      platform: 'paypal'
    });

    const redirectUrl = `/orders/${order.id}?cancelled=true&payment_cancelled=true`;

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'PAYPAL_CANCEL_REDIRECT',
      orderId: order.id,
      orderNumber: order.order_number,
      redirectUrl
    });

    return NextResponse.redirect(new URL(redirectUrl, request.url));

  } catch (error) {
    logMonitor('PAYMENTS', 'ERROR', {
      action: 'PAYPAL_CANCEL',
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.redirect(new URL('/quick-order', request.url));
  }
}
