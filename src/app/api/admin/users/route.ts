import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

const allowedRoles = ['admin', 'user'];

export async function GET(request: NextRequest) {
  logApiRequest('AUTH', 'GET', '/api/admin/users');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { page, limit, search } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || '';

    const whereClauses: string[] = [];
    const params: any[] = [];
    if (search) {
      whereClauses.push('(name LIKE ? OR email LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s);
    }
    if (role) {
      whereClauses.push('role = ?');
      params.push(role);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const countResult = await query(`SELECT COUNT(*) as total FROM users ${whereSQL}`, params);
    const total = countResult.rows[0]?.total || 0;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT id, name, email, phone, role, level, points, total_spent, created_at
       FROM users ${whereSQL}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    logApiSuccess('AUTH', 'GET_ADMIN_USERS', { total });
    return createSuccessResponse({ users: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    logApiError('AUTH', 'GET_ADMIN_USERS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  logApiRequest('AUTH', 'POST', '/api/admin/users');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { name, email, phone, password, role = 'user' } = body;
    if (!name || !email || !password) return createErrorResponse('MISSING_PARAMS', 400);
    if (!allowedRoles.includes(role)) return createErrorResponse('INVALID_ROLE', 400);

    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.rows.length > 0) return createErrorResponse('USER_EXISTS', 400);

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertResult = await query(
      `INSERT INTO users (name, email, phone, password, role, level, points, total_spent)
       VALUES (?, ?, ?, ?, ?, 'regular', 0, 0)`,
      [name, email, phone || null, hashedPassword, role]
    );

    await recordAdminAuditLog({
      request,
      module: 'AUTH',
      action: 'CREATE_ADMIN_USER',
      resourceType: 'user',
      resourceId: String(insertResult.lastInsertRowid),
      description: `管理员创建用户 ${email}`,
      operator: auth.user?.email || 'admin',
      status: 'success',
      riskLevel: role === 'admin' ? 'high' : 'medium',
    });

    const userResult = await query(
      'SELECT id, name, email, phone, role, level, points, total_spent, created_at FROM users WHERE id = ?',
      [insertResult.lastInsertRowid]
    );
    logApiSuccess('AUTH', 'CREATE_ADMIN_USER', { userId: insertResult.lastInsertRowid });
    return createSuccessResponse(userResult.rows[0], 201);
  } catch (error) {
    logApiError('AUTH', 'CREATE_ADMIN_USER', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest) {
  logApiRequest('AUTH', 'PUT', '/api/admin/users');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { id, name, email, phone, role, password } = body;
    if (!id) return createErrorResponse('MISSING_PARAMS', 400);
    if (role && !allowedRoles.includes(role)) return createErrorResponse('INVALID_ROLE', 400);

    const existing = await query('SELECT id, email FROM users WHERE id = ?', [id]);
    if (existing.rows.length === 0) return createErrorResponse('USER_NOT_FOUND', 404);

    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries({ name, email, phone, role })) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (password) {
      fields.push('password = ?');
      values.push(await bcrypt.hash(password, 10));
    }
    if (fields.length === 0) return createErrorResponse('NO_FIELDS_TO_UPDATE', 400);

    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
    await recordAdminAuditLog({
      request,
      module: 'AUTH',
      action: 'UPDATE_ADMIN_USER',
      resourceType: 'user',
      resourceId: String(id),
      description: `管理员更新用户 ${existing.rows[0].email}`,
      operator: auth.user?.email || 'admin',
      status: 'success',
      riskLevel: role === 'admin' || password ? 'high' : 'medium',
    });

    const userResult = await query('SELECT id, name, email, phone, role, level, points, total_spent, created_at FROM users WHERE id = ?', [id]);
    logApiSuccess('AUTH', 'UPDATE_ADMIN_USER', { userId: id });
    return createSuccessResponse(userResult.rows[0]);
  } catch (error) {
    logApiError('AUTH', 'UPDATE_ADMIN_USER', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest) {
  logApiRequest('AUTH', 'DELETE', '/api/admin/users');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return createErrorResponse('MISSING_PARAMS', 400);

    const existing = await query('SELECT id, email, role FROM users WHERE id = ?', [id]);
    if (existing.rows.length === 0) return createErrorResponse('USER_NOT_FOUND', 404);

    await query('DELETE FROM users WHERE id = ?', [id]);
    await recordAdminAuditLog({
      request,
      module: 'AUTH',
      action: 'DELETE_ADMIN_USER',
      resourceType: 'user',
      resourceId: String(id),
      description: `管理员删除用户 ${existing.rows[0].email}`,
      operator: auth.user?.email || 'admin',
      status: 'success',
      riskLevel: existing.rows[0].role === 'admin' ? 'critical' : 'high',
    });

    logApiSuccess('AUTH', 'DELETE_ADMIN_USER', { userId: id });
    return createSuccessResponse({ message: '用户已删除' });
  } catch (error) {
    logApiError('AUTH', 'DELETE_ADMIN_USER', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
