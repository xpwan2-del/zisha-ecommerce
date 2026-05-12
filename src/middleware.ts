import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logMonitor } from '@/lib/utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || '';

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function verifyMiddlewareToken(token: string) {
  if (!JWT_SECRET) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${payload}`));
  if (bytesToBase64Url(new Uint8Array(expectedSignature)) !== signature) {
    return null;
  }

  const decodedPayload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
  if (decodedPayload?.exp && decodedPayload.exp * 1000 < Date.now()) {
    return null;
  }

  return decodedPayload;
}

// ============================================================
// 路由监听中间件
// ============================================================
/**
 * middleware - 路由监听中间件
 * @description 拦截所有 /api/* 请求，记录路由访问日志
 * @param request - Next.js 请求对象
 * @returns NextResponse - 继续处理请求
 * @reuses:
 *   - logMonitor('ROUTER', 'REQUEST') - 记录请求进入
 *   - logMonitor('ROUTER', 'RESPONSE') - 记录响应返回
 */
export async function middleware(request: NextRequest) {
  const startTime = performance.now();

  const method = request.method;
  const pathname = request.nextUrl.pathname;

  const protectedRoutes = [
    '/cart',
    '/account',
    '/orders',
    '/addresses',
    '/checkout',
    '/favorites',
    '/feedback',
    '/user'
  ];

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');

  if (isProtectedRoute || isAdminRoute) {
    const token = request.cookies.get('access_token')?.value;
    const user = token ? await verifyMiddlewareToken(token) : null;

    const hasAccess = isProtectedRoute
      ? Boolean(user)
      : Boolean(user && user.role === 'admin');

    if (!hasAccess) {
      logMonitor('ROUTER', 'AUTH_FAILED', { pathname, reason: 'No valid access, redirecting to login' });
      if (pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ success: false, error: 'UNAUTHORIZED' }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        );
      }

      const loginUrl = pathname.startsWith('/admin') ? '/admin/login' : '/login';
      const redirectResponse = NextResponse.redirect(new URL(`${loginUrl}?from=${encodeURIComponent(pathname)}`, request.url));
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return redirectResponse;
    }
  }

  logMonitor('ROUTER', 'REQUEST', { pathname, method });

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  const endTime = performance.now();
  const duration = `${(endTime - startTime).toFixed(2)}ms`;

  logMonitor('ROUTER', 'RESPONSE', {
    pathname,
    method,
    status: response.status,
    duration
  });

  return response;
}

// ============================================================
// 路由匹配配置
// ============================================================
/**
 * config - 中间件配置
 * @description 定义中间件匹配的路由模式
 * @property matcher - 匹配的路由数组，支持通配符
 */
export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/cart/:path*',
    '/account/:path*',
    '/orders/:path*',
    '/addresses/:path*',
    '/checkout/:path*',
    '/favorites/:path*',
    '/payment-result/:path*',
    '/feedback/:path*',
    '/user/:path*',
  ],
};
