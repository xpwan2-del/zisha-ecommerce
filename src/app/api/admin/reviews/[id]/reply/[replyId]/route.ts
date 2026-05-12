import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

const MAX_REVIEW_REPLY_LENGTH = 2000;

function validateReplyText(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return 'INVALID_REPLY_CONTENT';
  if (value.trim().length > MAX_REVIEW_REPLY_LENGTH) return 'REPLY_CONTENT_TOO_LONG';
  return null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; replyId: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const rp = await params;
    const reviewId = parseInt(rp.id);
    const replyId = parseInt(rp.replyId);
    logApiRequest('PRODUCTS', 'PUT', `/api/admin/reviews/${rp.id}/reply/${replyId}`);

    if (!Number.isInteger(reviewId) || reviewId <= 0 || !Number.isInteger(replyId) || replyId <= 0) {
      return createErrorResponse('INVALID_REVIEW_REPLY_ID', 400);
    }

    const body = await request.json();
    const { content, content_en, content_ar } = body;
    const validationError = validateReplyText(content) || validateReplyText(content_en) || validateReplyText(content_ar);
    if (validationError) return createErrorResponse(validationError, 400);

    const existing = await query('SELECT * FROM review_replies WHERE id = ? AND review_id = ?', [replyId, reviewId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const updates: string[] = [];
    const paramsArr: any[] = [];
    if (content !== undefined) { updates.push('content = ?'); paramsArr.push(content.trim()); }
    if (content_en !== undefined) { updates.push('content_en = ?'); paramsArr.push(content_en.trim()); }
    if (content_ar !== undefined) { updates.push('content_ar = ?'); paramsArr.push(content_ar.trim()); }
    if (updates.length === 0) return createErrorResponse('EMPTY_UPDATE', 400);
    updates.push("updated_at = datetime('now')");

    paramsArr.push(replyId, reviewId);
    const result = await query(`UPDATE review_replies SET ${updates.join(', ')} WHERE id = ? AND review_id = ?`, paramsArr);
    if (!result.changes) return createErrorResponse('NOT_FOUND', 404);

    await recordAdminAuditLog({
      request,
      module: 'REVIEWS',
      action: 'UPDATE_REVIEW_REPLY',
      description: `管理员更新评论回复: ${replyId}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: replyId,
      resourceType: 'review_reply',
      riskLevel: 'medium',
      metadata: { reviewId, replyId, columns: updates.filter((item) => !item.startsWith('updated_at')), before: existing.rows[0] }
    });

    logApiSuccess('PRODUCTS', 'UPDATE_REVIEW_REPLY', { replyId });
    return createSuccessResponse({ message: '回复已更新' });
  } catch (error) {
    logApiError('PRODUCTS', 'UPDATE_REVIEW_REPLY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; replyId: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const rp = await params;
    const reviewId = parseInt(rp.id);
    const replyId = parseInt(rp.replyId);
    logApiRequest('PRODUCTS', 'DELETE', `/api/admin/reviews/${rp.id}/reply/${replyId}`);

    if (!Number.isInteger(reviewId) || reviewId <= 0 || !Number.isInteger(replyId) || replyId <= 0) {
      return createErrorResponse('INVALID_REVIEW_REPLY_ID', 400);
    }

    const existing = await query('SELECT * FROM review_replies WHERE id = ? AND review_id = ?', [replyId, reviewId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const result = await query('DELETE FROM review_replies WHERE id = ? AND review_id = ?', [replyId, reviewId]);
    if (!result.changes) return createErrorResponse('NOT_FOUND', 404);

    await recordAdminAuditLog({
      request,
      module: 'REVIEWS',
      action: 'DELETE_REVIEW_REPLY',
      description: `管理员删除评论回复: ${replyId}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: replyId,
      resourceType: 'review_reply',
      riskLevel: 'high',
      metadata: { reviewId, replyId, deleted: existing.rows[0] }
    });

    logApiSuccess('PRODUCTS', 'DELETE_REVIEW_REPLY', { replyId });
    return createSuccessResponse({ message: '回复已删除' });
  } catch (error) {
    logApiError('PRODUCTS', 'DELETE_REVIEW_REPLY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
