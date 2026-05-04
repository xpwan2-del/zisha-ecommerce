import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('PRODUCTS', 'GET', '/api/admin/promotions');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { search } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (search) {
      whereClauses.push('(p.name LIKE ? OR p.name_en LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s);
    }
    if (status === 'active') whereClauses.push("p.status = 'active'");
    if (status === 'inactive') whereClauses.push("p.status = 'inactive'");

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const result = await query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM product_promotions WHERE promotion_id = p.id) as product_count,
              (SELECT COALESCE(SUM(total_orders), 0) FROM promotion_stats WHERE promotion_id = p.id) as total_order_count,
              (SELECT COALESCE(SUM(total_discount), 0) FROM promotion_stats WHERE promotion_id = p.id) as total_discount_amount
       FROM promotions p ${whereSQL}
       ORDER BY p.created_at DESC`,
      params
    );

    logApiSuccess('PRODUCTS', 'GET_PROMOTIONS');
    return createSuccessResponse(result.rows);
  } catch (error) {
    logApiError('PRODUCTS', 'GET_PROMOTIONS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  logApiRequest('PRODUCTS', 'POST', '/api/admin/promotions');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { name, name_en, name_ar, type, discount_percent, status, description, min_spend, max_discount, usage_limit, icon, color } = body;

    if (!name || !type || discount_percent === undefined) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const result = await query(
      `INSERT INTO promotions (name, name_en, name_ar, type, discount_percent, status, description, min_spend, max_discount, usage_limit, icon, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [name, name_en || '', name_ar || '', type, discount_percent, status || 'active', description || '',
       min_spend || 0, max_discount || null, usage_limit || null, icon || '', color || '']
    );

    logApiSuccess('PRODUCTS', 'CREATE_PROMOTION', { name, type, discount_percent });
    return createSuccessResponse({ id: result.lastInsertRowid, name }, 201);
  } catch (error) {
    logApiError('PRODUCTS', 'CREATE_PROMOTION', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
