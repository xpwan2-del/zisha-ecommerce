import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; replyId: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const rp = await params;
    const replyId = parseInt(rp.replyId);
    logApiRequest('PRODUCTS', 'PUT', `/api/admin/reviews/${rp.id}/reply/${replyId}`);

    const body = await request.json();
    const { content, content_en, content_ar } = body;

    const existing = await query('SELECT * FROM review_replies WHERE id = ?', [replyId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const updates: string[] = [];
    const paramsArr: any[] = [];
    if (content !== undefined) { updates.push('content = ?'); paramsArr.push(content); }
    if (content_en !== undefined) { updates.push('content_en = ?'); paramsArr.push(content_en); }
    if (content_ar !== undefined) { updates.push('content_ar = ?'); paramsArr.push(content_ar); }
    updates.push("updated_at = datetime('now')");

    paramsArr.push(replyId);
    await query(`UPDATE review_replies SET ${updates.join(', ')} WHERE id = ?`, paramsArr);

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
    const replyId = parseInt(rp.replyId);
    logApiRequest('PRODUCTS', 'DELETE', `/api/admin/reviews/${rp.id}/reply/${replyId}`);

    await query('DELETE FROM review_replies WHERE id = ?', [replyId]);

    logApiSuccess('PRODUCTS', 'DELETE_REVIEW_REPLY', { replyId });
    return createSuccessResponse({ message: '回复已删除' });
  } catch (error) {
    logApiError('PRODUCTS', 'DELETE_REVIEW_REPLY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
