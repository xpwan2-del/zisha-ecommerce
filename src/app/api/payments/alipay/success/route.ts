import { NextRequest, NextResponse } from 'next/server';
import { logMonitor } from '@/lib/utils/logger';

/**
 * @api {GET|POST} /api/payments/alipay/success Alipay 支付成功回调（兼容）
 * @apiName AlipaySuccess
 * @apiGroup PAYMENTS
 * @apiDescription Alipay 支付成功后的回调入口（兼容旧 URL）。
 * 将请求参数转发到统一支付结果 API 处理。
 *
 * @apiParam {String} trade_no Alipay 交易号
 * @apiParam {String} [out_trade_no] 商户订单号
 */

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tradeNo = searchParams.get('trade_no') || '';
  const outTradeNo = searchParams.get('out_trade_no') || '';

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'GET',
    path: '/api/payments/alipay/success',
    hasTradeNo: !!tradeNo
  });

  const redirectUrl = new URL('/api/payments/result', request.url);
  redirectUrl.searchParams.set('trade_no', tradeNo);
  redirectUrl.searchParams.set('platform', 'alipay');
  if (outTradeNo) {
    redirectUrl.searchParams.set('order_number', outTradeNo);
  }

  return NextResponse.redirect(redirectUrl);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const tradeNo = body.trade_no || '';
  const outTradeNo = body.out_trade_no || '';

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'POST',
    path: '/api/payments/alipay/success',
    hasTradeNo: !!tradeNo
  });

  const redirectUrl = new URL('/api/payments/result', request.url);
  redirectUrl.searchParams.set('trade_no', tradeNo);
  redirectUrl.searchParams.set('platform', 'alipay');
  if (outTradeNo) {
    redirectUrl.searchParams.set('order_number', outTradeNo);
  }

  return NextResponse.redirect(redirectUrl);
}
