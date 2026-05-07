import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('API', 'GET', '/api/admin/settings/audit-logs');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { page, limit } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const logModule = searchParams.get('module') || '';
    const action = searchParams.get('action') || '';
    const status = searchParams.get('status') || '';

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (logModule) { whereClauses.push('module = ?'); params.push(logModule); }
    if (action) { whereClauses.push('action = ?'); params.push(action); }
    if (status) { whereClauses.push('status = ?'); params.push(status); }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countResult = await query(`SELECT COUNT(*) as total FROM audit_logs ${whereSQL}`, params);
    const total = countResult.rows[0]?.total || 0;

    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT * FROM audit_logs ${whereSQL} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    logApiSuccess('API', 'GET_AUDIT_LOGS', { total });
    return createSuccessResponse({
      logs: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logApiError('API', 'GET_AUDIT_LOGS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
