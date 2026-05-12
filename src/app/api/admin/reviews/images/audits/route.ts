import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';

export async function GET(request: NextRequest) {
  logApiRequest('PRODUCTS', 'GET', '/api/admin/reviews/images/audits');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const countResult = await query(
      `SELECT COUNT(*) as total FROM review_images WHERE audit_status = ?`,
      [status]
    );
    const total = countResult.rows[0]?.total || 0;

    const imagesResult = await query(
      `SELECT ri.*, r.comment as review_comment, r.rating, u.name as user_name, p.name as product_name
       FROM review_images ri
       JOIN reviews r ON ri.review_id = r.id
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products p ON r.product_id = p.id
       WHERE ri.audit_status = ?
       ORDER BY ri.created_at DESC
       LIMIT ? OFFSET ?`,
      [status, limit, offset]
    );

    logApiSuccess('PRODUCTS', 'GET_REVIEW_IMAGES', { status, total });
    return createSuccessResponse({
      images: imagesResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logApiError('PRODUCTS', 'GET_REVIEW_IMAGES', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PATCH(request: NextRequest) {
  logApiRequest('PRODUCTS', 'PATCH', '/api/admin/reviews/images/audits');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids)
      ? body.ids.map((id: unknown) => Number(id)).filter((id: number) => Number.isInteger(id) && id > 0)
      : [];
    const auditStatus = typeof body.audit_status === 'string' ? body.audit_status : '';
    const auditNote = typeof body.audit_note === 'string' ? body.audit_note : '';

    if (ids.length === 0 || !['approved', 'rejected'].includes(auditStatus)) {
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    const placeholders = ids.map(() => '?').join(', ');
    await query(
      `UPDATE review_images SET audit_status = ?, audit_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
      [auditStatus, auditNote, ...ids]
    );

    await recordAdminAuditLog({
      request,
      module: 'PRODUCTS',
      action: 'AUDIT_REVIEW_IMAGES',
      description: `管理员审核评价图片 (${auditStatus})`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceType: 'review_image',
      riskLevel: 'low',
      metadata: { ids, auditStatus, auditNote },
    });

    logApiSuccess('PRODUCTS', 'AUDIT_REVIEW_IMAGES', { status: auditStatus, count: ids.length });
    return createSuccessResponse({ ids, audit_status: auditStatus, updatedCount: ids.length });
  } catch (error) {
    logApiError('PRODUCTS', 'AUDIT_REVIEW_IMAGES', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
