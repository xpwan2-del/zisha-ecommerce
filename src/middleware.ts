// @reuses: 所有路由监听统一通过 logger.ts 管理
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logMonitor } from '@/lib/utils/logger';  // @reuses: 复用 logger.ts 的统一日志

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
export function middleware(request: NextRequest) {
  // 获取高精度计时器
  const startTime = performance.now();

  // 获取请求信息
  const url = request.url;
  const method = request.method;
  const pathname = request.nextUrl.pathname;

  // @reuses: logMonitor - 记录请求进入
  logMonitor('ROUTER', 'REQUEST', {
    url,
    method,
    pathname,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  });

  // 处理请求 - 添加缓存控制头
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  // 计算响应耗时
  const endTime = performance.now();
  const duration = `${(endTime - startTime).toFixed(2)}ms`;

  // @reuses: logMonitor - 记录响应返回
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
  // 匹配所有 API 路由
  matcher: [
    '/api/:path*',
  ],
};
