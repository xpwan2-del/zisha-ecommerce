import { NextRequest, NextResponse } from 'next/server';
import { logMonitor } from '@/lib/utils/logger';

/**
 * @api {GET} /api/payments/paypal/success PayPal 支付成功回调（兼容）
 * @apiName PayPalSuccess
 * @apiGroup PAYMENTS
 * @apiDescription PayPal 支付成功后的回调入口（兼容旧 URL）。
 * 将请求参数转发到统一支付结果 API 处理。
 *
 * @apiParam {String} token PayPal 返回的 token
 * @apiParam {String} [PayerID] PayPal PayerID
 */

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get('token') || '';
  const payerId = searchParams.get('PayerID') || '';

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'GET',
    path: '/api/payments/paypal/success',
    hasToken: !!token,
    hasPayerId: !!payerId
  });

  const redirectUrl = new URL('/api/payments/result', request.url);
  redirectUrl.searchParams.set('token', token);
  redirectUrl.searchParams.set('PayerID', payerId);
  redirectUrl.searchParams.set('platform', 'paypal');

  return NextResponse.redirect(redirectUrl);
}
