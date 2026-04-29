import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { OrderStatusService, OrderEvent, OperatorType } from '@/lib/order-status-service';
import { PaymentService } from '@/lib/payment/PaymentService';
import { logMonitor } from '@/lib/utils/logger';
import { getPaymentErrorMapping, resolvePaymentError } from '@/lib/payment/errorCodeMapper';

/**
 * ============================================================
 * PayPal 支付回调确认接口
 * ============================================================
 *
 * @api {POST} /api/payments/paypal/notify PayPal 支付确认回调
 * @apiName PayPalNotify
 * @apiGroup Payments
 * @apiDescription 处理 PayPal 支付回调，确认支付状态并更新订单
 *
 * **业务逻辑：**
 * 1. 接收 PayPal 返回的支付信息
 * 2. 调用 PayPal API 完成支付捕获
 * 3. 根据返回状态处理不同的支付结果
 * 4. 存储支付日志到数据库
 * 5. 根据错误类型返回对应的错误提示
 *
 * **PayPal 状态码处理：**
 * - COMPLETED / ORDER_ALREADY_CAPTURED → 支付成功
 * - ORDER_NOT_APPROVED → 支付未完成
 * - INSTRUMENT_DECLINED → 银行卡被拒
 * - PAYER_CANNOT_PAY → 账户无法支付
 * - TRANSACTION_REFUSED → 交易被拒绝
 * - 其他错误 → 根据配置返回提示
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiParam {String} orderId PayPal 订单ID
 * @apiParam {String} order_number 我们的订单号
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} status 支付状态
 * @apiSuccess {String} error_code 错误码（失败时）
 * @apiSuccess {String} message 错误信息（失败时）
 * @apiSuccess {String} message_zh 中文错误信息
 * @apiSuccess {String} message_en 英文错误信息
 * @apiSuccess {String} message_ar 阿拉伯文错误信息
 *
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "status": "captured",
 *       "payment_id": "7RA921805E0709241"
 *     }
 *
 * @apiErrorExample {json} Error-Response:
 *     {
 *       "success": false,
 *       "status": "fail",
 *       "error_code": "INSTRUMENT_DECLINED",
 *       "message": "支付方式被拒绝，请更换银行卡",
 *       "message_en": "Payment method declined, please change card",
 *       "message_ar": "تم رفض طريقة الدفع، يرجى تغيير البطاقة"
 *     }
 */

const PAYPAL_API_BASE_SANDBOX = 'https://api-m.sandbox.paypal.com';
const PAYPAL_API_BASE_LIVE = 'https://api-m.paypal.com';

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
 * getAccessToken - 获取 PayPal Access Token
 */
async function getAccessToken(clientId: string, clientSecret: string, isSandbox: boolean): Promise<string> {
  const baseUrl = isSandbox ? PAYPAL_API_BASE_SANDBOX : PAYPAL_API_BASE_LIVE;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * capturePayPalOrder - 捕获 PayPal 订单
 */
async function capturePayPalOrder(accessToken: string, orderId: string, isSandbox: boolean) {
  const baseUrl = isSandbox ? PAYPAL_API_BASE_SANDBOX : PAYPAL_API_BASE_LIVE;

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response;
}

/**
 * getPayPalErrorMessage - 从数据库获取错误提示
 */
async function getPayPalErrorMessage(errorCode: string, lang: string): Promise<{ code: string; type: string; message: string }> {
  const mapping = await getPaymentErrorMapping('paypal', errorCode);
  if (!mapping) {
    return {
      code: 'UNKNOWN_ERROR',
      type: 'fail',
      message: lang === 'zh' ? '支付失败，请稍后重试' :
              lang === 'ar' ? 'فشل الدفع، يرجى المحاولة لاحقًا' :
              'Payment failed, please retry later'
    };
  }

  const msg = lang === 'zh'
    ? (mapping.messageZh || mapping.messageEn || mapping.messageAr || mapping.originalCode)
    : lang === 'ar'
      ? (mapping.messageAr || mapping.messageEn || mapping.messageZh || mapping.originalCode)
      : (mapping.messageEn || mapping.messageZh || mapping.messageAr || mapping.originalCode);

  return { code: mapping.unifiedCode, type: mapping.errorType, message: msg };
}

/**
 * savePayPalLog - 保存支付日志（使用统一的 payment_logs 表）
 */
async function savePayPalLog(
  orderId: number,
  orderNumber: string,
  paypalOrderId: string,
  httpStatusCode: number,
  errorName: string | null,
  errorIssue: string | null,
  errorDescription: string | null,
  rawResponse: string,
  isSuccess: boolean,
  amount: number,
  currency: string = 'USD'
) {
  await query(
    `INSERT INTO payment_logs 
     (order_id, order_number, payment_method, platform_order_id, status, error_code, error_message, raw_response, is_success, amount, currency, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      orderId, 
      orderNumber, 
      'paypal', 
      paypalOrderId, 
      isSuccess ? 'success' : 'failed',
      errorIssue || 'UNKNOWN_ERROR', 
      errorDescription || null, 
      rawResponse, 
      isSuccess ? 1 : 0,
      amount,
      currency
    ]
  );
}

// ============================================================
// POST - 处理 PayPal 回调
// ============================================================

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  // 监听：请求进入
  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'POST',
    path: '/api/payments/paypal/notify',
    lang
  });

  try {
    const body = await request.json();
    const { orderId, order_number, token, PayerID } = body;

    const platformOrderId = orderId || token;

    // 参数校验
    if (!platformOrderId || !order_number) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', {
        reason: 'Missing orderId or order_number',
        orderId,
        order_number,
        token
      });
      return NextResponse.json({
        success: false,
        error: 'MISSING_PARAMS',
        message: lang === 'zh' ? '缺少必要参数' :
                lang === 'ar' ? 'معامالت مفقودة' :
                'Missing required parameters'
      }, { status: 400 });
    }

    // 查询本地订单
    let orderResult = await query(
      'SELECT id, order_number, final_amount, payment_status, order_status FROM orders WHERE order_number = ?',
      [order_number]
    );

    // 如果找不到，通过 reference_id 查询
    if (orderResult.rows.length === 0) {
      logMonitor('PAYMENTS', 'NOT_FOUND', {
        reason: 'Order not found by order_number, trying by reference_id',
        order_number,
        orderId: platformOrderId
      });
      orderResult = await query(
        'SELECT id, order_number, final_amount, payment_status, order_status FROM orders WHERE reference_id = ?',
        [platformOrderId]
      );
    }

    if (orderResult.rows.length === 0) {
      logMonitor('PAYMENTS', 'NOT_FOUND', {
        reason: 'Order not found',
        order_number,
        orderId: platformOrderId
      });
      const errorInfo = await getPayPalErrorMessage('HTTP_404', lang);
      return NextResponse.json({
        success: false,
        status: 'fail',
        error_code: 'HTTP_404',
        message: errorInfo.message
      }, { status: 404 });
    }

    const order = orderResult.rows[0];

    // 检查订单是否已支付
    if (order.payment_status === 'paid') {
      logMonitor('PAYMENTS', 'SUCCESS', {
        action: 'PAYMENT_ALREADY_PAID',
        orderId: order.id,
        order_number
      });
      return NextResponse.json({
        success: true,
        status: 'already_paid',
        message: '订单已支付'
      });
    }

    // 检查是否已经有成功的支付记录
    const existingPayment = await query(
      'SELECT id FROM order_payments WHERE order_id = ? AND payment_status = ?',
      [order.id, 'paid']
    );
    
    if (existingPayment.rows.length > 0) {
      logMonitor('PAYMENTS', 'SUCCESS', {
        action: 'PAYMENT_ALREADY_EXISTS',
        orderId: order.id,
        order_number,
        transactionId: existingPayment.rows[0].id
      });
      return NextResponse.json({
        success: true,
        status: 'already_paid',
        message: '订单已支付'
      });
    }

    // 获取 PayPal 配置
    await PaymentService.initialize();
    const paypalConfig = PaymentService.getConfig('paypal');
    if (!paypalConfig || !paypalConfig.config_json) {
      logMonitor('PAYMENTS', 'ERROR', {
        action: 'PAYMENT_CONFIG_ERROR',
        error: 'PayPal config not found'
      });
      const errorInfo = await getPayPalErrorMessage('HTTP_401', lang);
      return NextResponse.json({
        success: false,
        status: 'fail',
        error_code: 'HTTP_401',
        message: errorInfo.message
      }, { status: 500 });
    }

    const configData = JSON.parse(paypalConfig.config_json);
    const isSandbox = paypalConfig.is_sandbox;

    // 获取 Access Token
    logMonitor('PAYMENTS', 'INFO', {
      action: 'GET_ACCESS_TOKEN'
    });
    const accessToken = await getAccessToken(configData.client_id, configData.client_secret, isSandbox);

    // 捕获订单
    logMonitor('PAYMENTS', 'INFO', {
      action: 'CAPTURE_PAYPAL_ORDER',
      paypalOrderId: platformOrderId
    });
    const captureResponse = await capturePayPalOrder(accessToken, platformOrderId, isSandbox);
    const responseStatus = captureResponse.status;
    const responseData = await captureResponse.json();

    logMonitor('PAYMENTS', 'INFO', {
      action: 'PAYPAL_RESPONSE',
      httpStatus: responseStatus,
      paypalStatus: responseData.status,
      errorIssue: responseData.details?.[0]?.issue
    });

    const issues: Array<{ issue: string; description?: string }> = Array.isArray(responseData?.details)
      ? responseData.details.map((d: any) => ({ issue: d.issue, description: d.description }))
      : [];

    const errorIssue = issues[0]?.issue;
    const alreadyCaptured = issues.some((i) => i.issue === 'ORDER_ALREADY_CAPTURED');
    const isSuccess = responseStatus === 200 ||
      responseStatus === 201 ||
      responseData.status === 'COMPLETED' ||
      alreadyCaptured;

    const errorCode = isSuccess
      ? (alreadyCaptured ? 'ORDER_ALREADY_CAPTURED' : 'COMPLETED')
      : 'UNKNOWN_ERROR';

    const resolved = isSuccess
      ? null
      : await resolvePaymentError({
          platform: 'paypal',
          lang: (lang as any) || 'zh',
          httpStatus: responseStatus,
          name: responseData?.name,
          issues,
          messageEn: responseData?.message
        });

    await savePayPalLog(
      order.id,
      order_number,
      platformOrderId,
      responseStatus,
      responseData.name || null,
      resolved?.originalCode || null,
      responseData.details?.[0]?.description || responseData.message || null,
      JSON.stringify(responseData),
      isSuccess,
      parseFloat(order.final_amount),
      'USD'
    );

    // 如果支付成功，更新订单状态
    if (isSuccess) {
      logMonitor('PAYMENTS', 'SUCCESS', {
        action: 'PAYMENT_SUCCESS',
        orderId: order.id,
        order_number,
        errorCode
      });

      // 验证支付金额
      const capturedAmount = parseFloat(responseData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0');
      const orderAmount = parseFloat(order.final_amount);
      
      if (Math.abs(capturedAmount - orderAmount) > 0.01) {
        logMonitor('PAYMENTS', 'WARNING', {
          action: 'AMOUNT_MISMATCH',
          orderId: order.id,
          order_number,
          capturedAmount,
          orderAmount,
          difference: Math.abs(capturedAmount - orderAmount)
        });
      }

      // 保存 reference_id
      await query(
        'UPDATE orders SET reference_id = ? WHERE id = ?',
        [orderId, order.id]
      );

      // 更新订单状态
      const statusResult = await OrderStatusService.changeStatus(
        order.id,
        OrderEvent.PAY_SUCCESS,
        {
          type: OperatorType.SYSTEM,
          id: 0,
          name: 'PayPal'
        },
        { paypal_order_id: orderId, paypal_capture_id: responseData.id || orderId }
      );

      // 更新支付状态
      await query(
        'UPDATE orders SET payment_status = ? WHERE id = ?',
        ['paid', order.id]
      );

      // 记录支付记录（添加幂等性检查）
      try {
        await query(
          `INSERT INTO order_payments
           (order_id, payment_method, transaction_id, amount, payment_status, paid_at)
           VALUES (?, ?, ?, ?, 'paid', datetime('now'))`,
          [order.id, 'paypal', responseData.id || orderId, order.final_amount]
        );
      } catch (err: any) {
        // 如果 transaction_id 已存在，忽略错误
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
          logMonitor('PAYMENTS', 'INFO', {
            action: 'PAYMENT_RECORD_EXISTS',
            orderId: order.id,
            transactionId: responseData.id || orderId
          });
        } else {
          throw err;
        }
      }

      // 更新支付日志为成功
      await query(
        'UPDATE payment_logs SET is_success = 1, status = ? WHERE order_number = ? AND platform_order_id = ?',
        ['success', order_number, orderId]
      );

      // 支付成功后删除购物车中对应的商品项
      const orderItemsResult = await query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [order.id]
      );
      for (const item of orderItemsResult.rows) {
        await query(
          `DELETE FROM cart_items WHERE user_id = ? AND product_id = ?`,
          [order.user_id, item.product_id]
        );
      }

      return NextResponse.json({
        success: true,
        status: errorCode === 'ORDER_ALREADY_CAPTURED' ? 'already_paid' : 'captured',
        payment_id: responseData.id || orderId
      });
    }

    // 支付失败，获取错误提示
    if (!resolved) {
      const errorInfo = await getPayPalErrorMessage('UNKNOWN_ERROR', lang);
      return NextResponse.json({
        success: false,
        status: 'fail',
        error_code: 'UNKNOWN_ERROR',
        message: errorInfo.message
      }, { status: 500 });
    }

    const errorInfo = await getPayPalErrorMessage(resolved.originalCode, lang);

    logMonitor('PAYMENTS', 'PAYMENT_FAILED', {
      action: 'PAYMENT_FAILED',
      orderId: order.id,
      order_number,
      originalCode: resolved.originalCode,
      unifiedCode: resolved.unifiedCode,
      errorIssue
    });

    return NextResponse.json({
      success: false,
      status: 'fail',
      error_code: resolved.unifiedCode,
      message: errorInfo.message,
      message_zh: (await getPayPalErrorMessage(resolved.originalCode, 'zh')).message,
      message_en: (await getPayPalErrorMessage(resolved.originalCode, 'en')).message,
      message_ar: (await getPayPalErrorMessage(resolved.originalCode, 'ar')).message
    }, { status: 400 });

  } catch (error: any) {
    logMonitor('PAYMENTS', 'ERROR', {
      action: 'PAYMENT_NOTIFY_ERROR',
      error: String(error)
    });

    const errorInfo = await getPayPalErrorMessage('UNKNOWN_ERROR', lang);

    return NextResponse.json({
      success: false,
      status: 'fail',
      error_code: 'UNKNOWN_ERROR',
      message: errorInfo.message
    }, { status: 500 });
  }
}
