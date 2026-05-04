import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('AUTH', 'GET', '/api/admin/users');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { page, limit, search } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || '';

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (search) {
      whereClauses.push('(name LIKE ? OR email LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s);
    }
    if (role) { whereClauses.push('role = ?'); params.push(role); }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countResult = await query(`SELECT COUNT(*) as total FROM users ${whereSQL}`, params);
    const total = countResult.rows[0]?.total || 0;

    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT id, name, email, phone, role, level, points, total_spent, created_at
       FROM users ${whereSQL}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    logApiSuccess('AUTH', 'GET_USERS', { total });
    return createSuccessResponse({
      users: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logApiError('AUTH', 'GET_USERS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
