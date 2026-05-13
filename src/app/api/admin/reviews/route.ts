import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, getPaginationParams, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';

const REVIEW_STATUS = new Set(['pending', 'approved', 'rejected']);

export async function GET(request: NextRequest) {
  logApiRequest('PRODUCTS', 'GET', '/api/admin/reviews');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { page, limit, search } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const rating = parseInt(searchParams.get('rating') || '0');
    const productId = parseInt(searchParams.get('productId') || '0');

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (search) {
      whereClauses.push('(r.comment LIKE ? OR u.name LIKE ? OR pro.name LIKE ?)');
      const likeSearch = `%${search}%`;
      params.push(likeSearch, likeSearch, likeSearch);
    }
    if (status === 'pending') whereClauses.push("r.status = 'pending'");
    if (status === 'approved') whereClauses.push("r.status = 'approved'");
    if (status === 'rejected') whereClauses.push("r.status = 'rejected'");
    if (rating > 0) {
      whereClauses.push('r.rating = ?');
      params.push(rating);
    }
    if (productId > 0) {
      whereClauses.push('r.product_id = ?');
      params.push(productId);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products pro ON r.product_id = pro.id
       ${whereSQL}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;
    const offset = (page - 1) * limit;

    const reviewsResult = await query(
      `SELECT r.*, u.name as user_name, u.email as user_email, pro.name as product_name, pro.name_en as product_name_en,
              (SELECT COUNT(*) FROM review_replies WHERE review_id = r.id) as reply_count,
              (SELECT COUNT(*) FROM review_follow_ups WHERE review_id = r.id) as follow_up_count,
              (SELECT COUNT(*) FROM review_follow_ups WHERE review_id = r.id AND status = 'pending') as pending_follow_up_count
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products pro ON r.product_id = pro.id
       ${whereSQL}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    logApiSuccess('PRODUCTS', 'GET_REVIEWS', { total });
    return createSuccessResponse({
      reviews: reviewsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logApiError('PRODUCTS', 'GET_REVIEWS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PATCH(request: NextRequest) {
  logApiRequest('PRODUCTS', 'PATCH', '/api/admin/reviews');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids)
      ? body.ids
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      : [];
    const status = typeof body.status === 'string' ? body.status : '';
    const isAbnormal = typeof body.is_abnormal === 'number' ? body.is_abnormal : null;

    if (ids.length === 0) {
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    if (status && !REVIEW_STATUS.has(status) && isAbnormal === null) {
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    const placeholders = ids.map(() => '?').join(', ');
    const existing = await query(
      `SELECT id FROM reviews WHERE id IN (${placeholders})`,
      ids
    );

    if (existing.rows.length === 0) {
      return createErrorResponse('NOT_FOUND', 404);
    }

    const existingIds = existing.rows
      .map((row: any) => Number(row.id))
      .filter((id: number) => Number.isInteger(id) && id > 0);

    const updatePlaceholders = existingIds.map(() => '?').join(', ');

    if (status) {
      await query(
        `UPDATE reviews SET status = ?, updated_at = datetime('now') WHERE id IN (${updatePlaceholders})`,
        [status, ...existingIds]
      );
    }

    if (isAbnormal !== null) {
      await query(
        `UPDATE reviews SET is_abnormal = ?, updated_at = datetime('now') WHERE id IN (${updatePlaceholders})`,
        [isAbnormal, ...existingIds]
      );
    }

    await recordAdminAuditLog({
      request,
      module: 'PRODUCTS',
      action: isAbnormal !== null ? 'MARK_REVIEW_ABNORMAL' : 'BATCH_UPDATE_REVIEWS',
      description: isAbnormal !== null ? `管理员标记评价异常 (${isAbnormal})` : `管理员批量更新评价状态 (${status})`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceType: 'review',
      riskLevel: 'low',
      metadata: { ids: existingIds, status, is_abnormal: isAbnormal },
    });

    logApiSuccess('PRODUCTS', 'BATCH_UPDATE_REVIEWS', {
      status,
      is_abnormal: isAbnormal,
      count: existingIds.length,
    });

    return createSuccessResponse({
      ids: existingIds,
      status,
      is_abnormal: isAbnormal,
      updatedCount: existingIds.length,
    });
  } catch (error) {
    logApiError('PRODUCTS', 'BATCH_UPDATE_REVIEWS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
