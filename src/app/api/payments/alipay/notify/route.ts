import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {POST} /api/payments/alipay/notify 支付宝支付回调
 * @apiName AlipayNotify
 * @apiGroup PAYMENTS
 * @apiDescription 接收支付宝异步通知，验签校验后返回结果。不写数据库，订单落单由 result 路由统一负责。
 */

function verifyAlipaySignature(params: Record<string, string>, publicKey: string): boolean {
  const sign = params['sign'];
  const signType = params['sign_type'] || 'RSA2';

  if (!sign) return false;

  const filteredParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'sign' && key !== 'sign_type' && value !== '' && value !== undefined && value !== null) {
      filteredParams[key] = value;
    }
  }

  const sortedKeys = Object.keys(filteredParams).sort();
  const signContent = sortedKeys.map(key => `${key}=${filteredParams[key]}`).join('&');

  try {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(signContent);
    const formattedKey = publicKey.includes('-----BEGIN')
      ? publicKey
      : `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    return verify.verify(formattedKey, sign, 'base64');
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    logMonitor('PAYMENTS', 'REQUEST', { method: 'POST', path: '/api/payments/alipay/notify' });

    const body = await request.text();
    const params: Record<string, string> = {};
    const urlParams = new URLSearchParams(body);
    urlParams.forEach((value, key) => {
      params[key] = value;
    });

    const outTradeNo = params['out_trade_no'];
    const tradeStatus = params['trade_status'];
    const totalAmount = params['total_amount'];
    const tradeNo = params['trade_no'];

    logMonitor('PAYMENTS', 'INFO', {
      action: 'ALIPAY_NOTIFY_RECEIVED',
      out_trade_no: outTradeNo,
      trade_status: tradeStatus,
      total_amount: totalAmount,
      trade_no: tradeNo
    });

    if (!outTradeNo) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', { reason: 'Missing out_trade_no' });
      return NextResponse.json('fail', { status: 400 });
    }

    const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
    if (!alipayPublicKey) {
      logMonitor('PAYMENTS', 'WARNING', {
        action: 'ALIPAY_PUBLIC_KEY_MISSING',
        reason: 'Skipping signature verification - ALIPAY_PUBLIC_KEY not configured'
      });
    } else {
      const isValid = verifyAlipaySignature(params, alipayPublicKey);
      if (!isValid) {
        logMonitor('PAYMENTS', 'AUTH_FAILED', {
          action: 'ALIPAY_SIGNATURE_INVALID',
          out_trade_no: outTradeNo
        });
        return NextResponse.json('fail', { status: 403 });
      }
      logMonitor('PAYMENTS', 'INFO', {
        action: 'ALIPAY_SIGNATURE_VERIFIED',
        out_trade_no: outTradeNo
      });
    }

    const orderResult = await query(
      'SELECT id, user_id, order_number, final_amount, payment_status, order_status FROM orders WHERE order_number = ?',
      [outTradeNo]
    );

    if (orderResult.rows.length === 0) {
      logMonitor('PAYMENTS', 'NOT_FOUND', { order_number: outTradeNo });
      return NextResponse.json('fail', { status: 404 });
    }

    const order = orderResult.rows[0];

    if (order.payment_status === 'paid') {
      logMonitor('PAYMENTS', 'INFO', { action: 'ALIPAY_ALREADY_PAID', order_number: outTradeNo });
      return NextResponse.json('success');
    }

    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      logMonitor('PAYMENTS', 'SUCCESS', {
        action: 'ALIPAY_NOTIFY_VERIFIED',
        orderId: order.id,
        orderNumber: outTradeNo,
        tradeStatus: tradeStatus,
        tradeNo: tradeNo
      });
      return NextResponse.json('success');
    }

    logMonitor('PAYMENTS', 'ERROR', { action: 'ALIPAY_NOTIFY_UNKNOWN_STATUS', tradeStatus: tradeStatus });
    return NextResponse.json('fail');
  } catch (error) {
    logMonitor('PAYMENTS', 'ERROR', { action: 'ALIPAY_NOTIFY', error: String(error) });
    return NextResponse.json('fail', { status: 500 });
  }
}