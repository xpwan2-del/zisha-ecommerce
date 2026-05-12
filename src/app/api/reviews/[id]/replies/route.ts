import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';
import { buildReviewPayload, createErrorResponse, createSuccessResponse, getLangFromRequest, refreshReviewCounters } from '../../route';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const lang = getLangFromRequest(request);
  const { id } = await params;
  const reviewId = Number(id);

  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'POST',
    path: `/api/reviews/${reviewId}/replies`,
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    if (!Number.isFinite(reviewId) || reviewId <= 0) {
      return createErrorResponse('INVALID_PARAMS', lang, 400);
    }

    const body = await request.json();
    const { content, content_en, content_ar } = body;
    if (!content || !String(content).trim()) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'Missing reply content',
        reviewId,
      });
      return createErrorResponse('MISSING_PARAMS', lang, 400);
    }

    const reviewResult = await query('SELECT * FROM reviews WHERE id = ? AND COALESCE(status, ?) = ?', [reviewId, 'approved', 'approved']);
    if (reviewResult.rows.length === 0) {
      logMonitor('PRODUCTS', 'NOT_FOUND', { reviewId });
      return createErrorResponse('NOT_FOUND', lang, 404);
    }

    const insertResult = await query(
      `INSERT INTO review_replies (review_id, user_id, content, content_en, content_ar, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [reviewId, Number(authResult.user.userId), String(content).trim(), content_en || null, content_ar || null]
    );

    await refreshReviewCounters(reviewId);
    const updated = await query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    const payload = await buildReviewPayload(updated.rows || [], lang, Number(authResult.user.userId));

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'CREATE_REVIEW_REPLY',
      reviewId,
      replyId: insertResult.lastInsertRowid,
    });

    return createSuccessResponse(payload[0]);
  } catch (error) {
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'CREATE_REVIEW_REPLY',
      reviewId,
      error: String(error),
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}
