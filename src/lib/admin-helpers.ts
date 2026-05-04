import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

export function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

export function createErrorResponse(error: string, status: number = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export function createSuccessResponse(data: any, status: number = 200) {
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

export function checkAdminAuth(request: NextRequest) {
  const result = requireAdmin(request);
  if (result.response) {
    logMonitor('API', 'AUTH_FAILED', { reason: 'Admin required' });
  }
  return result;
}

export function logApiRequest(module: string, method: string, path: string, extra?: Record<string, any>) {
  logMonitor(module, 'REQUEST', { method, path, ...extra });
}

export function logApiSuccess(module: string, action: string, extra?: Record<string, any>) {
  logMonitor(module, 'SUCCESS', { action, ...extra });
}

export function logApiError(module: string, action: string, error: unknown) {
  logMonitor(module, 'ERROR', { action, error: String(error) });
}

export function getPaginationParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return {
    page: Math.max(1, parseInt(searchParams.get('page') || '1')),
    limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20'))),
    search: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || 'created_at',
    sortOrder: (searchParams.get('sortOrder') || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
  };
}
