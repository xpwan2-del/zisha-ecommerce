import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const promoId = parseInt(id);
    logApiRequest('PRODUCTS', 'GET', `/api/admin/promotions/${promoId}`);

    const result = await query('SELECT * FROM promotions WHERE id = ?', [promoId]);
    if (result.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const products = await query(
      `SELECT pp.*, pr.name as product_name, pr.name_en as product_name_en,
              pr.image as product_image
       FROM product_promotions pp
       LEFT JOIN products pr ON pp.product_id = pr.id
       WHERE pp.promotion_id = ?`,
      [promoId]
    );

    const stats = await query('SELECT * FROM promotion_stats WHERE promotion_id = ? ORDER BY start_date DESC', [promoId]);

    logApiSuccess('PRODUCTS', 'GET_PROMOTION_DETAIL', { promoId, name: result.rows[0].name });
    return createSuccessResponse({
      promotion: result.rows[0],
      products: products.rows,
      stats: stats.rows
    });
  } catch (error) {
    logApiError('PRODUCTS', 'GET_PROMOTION_DETAIL', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const promoId = parseInt(id);
    logApiRequest('PRODUCTS', 'PUT', `/api/admin/promotions/${promoId}`);

    const body = await request.json();
    const { name, name_en, name_ar, type, discount_percent, status, description, min_spend, max_discount, usage_limit, icon, color } = body;

    const existing = await query('SELECT * FROM promotions WHERE id = ?', [promoId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const updates: string[] = [];
    const paramsArr: any[] = [];
    if (name !== undefined) { updates.push('name = ?'); paramsArr.push(name); }
    if (name_en !== undefined) { updates.push('name_en = ?'); paramsArr.push(name_en); }
    if (name_ar !== undefined) { updates.push('name_ar = ?'); paramsArr.push(name_ar); }
    if (type !== undefined) { updates.push('type = ?'); paramsArr.push(type); }
    if (discount_percent !== undefined) { updates.push('discount_percent = ?'); paramsArr.push(discount_percent); }
    if (status !== undefined) { updates.push('status = ?'); paramsArr.push(status); }
    if (description !== undefined) { updates.push('description = ?'); paramsArr.push(description); }
    if (min_spend !== undefined) { updates.push('min_spend = ?'); paramsArr.push(min_spend); }
    if (max_discount !== undefined) { updates.push('max_discount = ?'); paramsArr.push(max_discount); }
    if (usage_limit !== undefined) { updates.push('usage_limit = ?'); paramsArr.push(usage_limit); }
    if (icon !== undefined) { updates.push('icon = ?'); paramsArr.push(icon); }
    if (color !== undefined) { updates.push('color = ?'); paramsArr.push(color); }
    updates.push("updated_at = datetime('now')");

    paramsArr.push(promoId);
    await query(`UPDATE promotions SET ${updates.join(', ')} WHERE id = ?`, paramsArr);

    const updated = await query('SELECT * FROM promotions WHERE id = ?', [promoId]);

    await recordAdminAuditLog({
      request,
      module: 'PRODUCTS',
      action: 'UPDATE_PROMOTION',
      description: '管理员更新促销活动',
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: promoId,
      resourceType: 'promotion',
      riskLevel: 'critical',
      metadata: {
        name: updated.rows[0].name,
        changes: body,
      },
    });

    logApiSuccess('PRODUCTS', 'UPDATE_PROMOTION', { promoId, name: updated.rows[0].name });
    return createSuccessResponse(updated.rows[0]);
  } catch (error) {
    logApiError('PRODUCTS', 'UPDATE_PROMOTION', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const promoId = parseInt(id);
    logApiRequest('PRODUCTS', 'DELETE', `/api/admin/promotions/${promoId}`);

    const existing = await query('SELECT * FROM promotions WHERE id = ?', [promoId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    await query('DELETE FROM product_promotions WHERE promotion_id = ?', [promoId]);
    await query('DELETE FROM promotion_stats WHERE promotion_id = ?', [promoId]);
    await query('DELETE FROM promotions WHERE id = ?', [promoId]);

    await recordAdminAuditLog({
      request,
      module: 'PRODUCTS',
      action: 'DELETE_PROMOTION',
      description: '管理员删除促销活动',
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: promoId,
      resourceType: 'promotion',
      riskLevel: 'critical',
      metadata: {
        name: existing.rows[0].name,
        status: existing.rows[0].status,
        type: existing.rows[0].type,
      },
    });

    logApiSuccess('PRODUCTS', 'DELETE_PROMOTION', { promoId });
    return createSuccessResponse({ message: '促销活动已删除' });
  } catch (error) {
    logApiError('PRODUCTS', 'DELETE_PROMOTION', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
