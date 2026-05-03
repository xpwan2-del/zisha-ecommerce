import { NextRequest, NextResponse } from 'next/server';
import { logMonitor } from '@/lib/utils/logger';

/**
 * @api {GET} /api/payments/stripe/success Stripe 支付成功回调（兼容）
 * @apiName StripeSuccess
 * @apiGroup PAYMENTS
 * @apiDescription Stripe 支付成功后的回调入口（兼容旧 URL）。
 * 将请求参数转发到统一支付结果 API 处理。
 *
 * @apiParam {String} session_id Stripe Checkout Session ID
 */

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('session_id') || '';

  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'GET',
    path: '/api/payments/stripe/success',
    hasSessionId: !!sessionId
  });

  const redirectUrl = new URL('/api/payments/result', request.url);
  redirectUrl.searchParams.set('session_id', sessionId);
  redirectUrl.searchParams.set('platform', 'stripe');

  return NextResponse.redirect(redirectUrl);
}
