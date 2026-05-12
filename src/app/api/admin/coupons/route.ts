import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('COUPONS', 'GET', '/api/admin/coupons');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { page, limit, search, sortBy, sortOrder } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (search) {
      whereClauses.push('(code LIKE ? OR name LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s);
    }
    if (status === 'active') { whereClauses.push('is_active = 1'); }
    if (status === 'inactive') { whereClauses.push('is_active = 0'); }
    if (type) { whereClauses.push('type = ?'); params.push(type); }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countResult = await query(`SELECT COUNT(*) as total FROM coupons ${whereSQL}`, params);
    const total = countResult.rows[0]?.total || 0;

    const offset = (page - 1) * limit;
    const dataResult = await query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM user_coupons WHERE coupon_id = c.id) as claimed_count,
              (SELECT COUNT(*) FROM user_coupons WHERE coupon_id = c.id AND status = 'used') as used_count
       FROM coupons c ${whereSQL}
       ORDER BY ${sortBy === 'name' ? 'c.name' : 'c.created_at'} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    logApiSuccess('COUPONS', 'GET_COUPONS', { total });
    return createSuccessResponse({
      coupons: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logApiError('COUPONS', 'GET_COUPONS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  logApiRequest('COUPONS', 'POST', '/api/admin/coupons');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  const operatorName = auth.user.name || 'Admin';

  try {
    const body = await request.json();
    const {
      code,
      name,
      type,
      value,
      start_date,
      end_date,
      usage_limit = null,
      is_permanent = false,
      permanent_days = 0,
      is_stackable = false,
      is_active = true,
      description = null
    } = body;

    if (!code || typeof code !== 'string' || code.trim() === '') {
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    if (!type || (type !== 'percentage' && type !== 'fixed')) {
      return createErrorResponse('INVALID_TYPE', 400);
    }

    if (typeof value !== 'number' || value <= 0) {
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    if (type === 'percentage' && value > 100) {
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    if (!start_date || !end_date) {
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return createErrorResponse('INVALID_DATE', 400);
    }

    if (endDateObj <= startDateObj) {
      return createErrorResponse('INVALID_DATE', 400);
    }

    const checkResult = await query(
      'SELECT id FROM coupons WHERE code = ?',
      [code.trim()]
    );

    if ((checkResult.rows?.length || 0) > 0) {
      return createErrorResponse('DUPLICATE_CODE', 400);
    }

    const insertResult = await query(`
      INSERT INTO coupons (
        code, name, type, value,
        start_date, end_date, usage_limit, is_permanent,
        permanent_days, is_stackable, is_active, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      code.trim(),
      name.trim(),
      type,
      value,
      start_date,
      end_date,
      usage_limit,
      is_permanent ? 1 : 0,
      permanent_days,
      is_stackable ? 1 : 0,
      is_active ? 1 : 0,
      description
    ]);

    await recordAdminAuditLog({
      request,
      module: 'COUPONS',
      action: 'CREATE_COUPON',
      description: `创建优惠券 ${code.trim()}`,
      operator: operatorName,
      resourceId: Number(insertResult.lastInsertRowid),
      resourceType: 'coupon',
      riskLevel: 'medium',
      metadata: { code: code.trim(), name: name.trim(), type, value, start_date, end_date },
    });

    logApiSuccess('COUPONS', 'CREATE_COUPON', {
      couponId: insertResult.lastInsertRowid,
      code: code.trim()
    });

    return createSuccessResponse({
      id: insertResult.lastInsertRowid,
      code: code.trim(),
      name: name.trim()
    }, 201);

  } catch (error) {
    logApiError('COUPONS', 'CREATE_COUPON', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
