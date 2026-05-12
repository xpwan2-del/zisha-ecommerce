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
    path: `/api/reviews/${reviewId}/helpful`,
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
    const { is_helpful } = body;
    if (typeof is_helpful !== 'boolean') {
      return createErrorResponse('INVALID_PARAMS', lang, 400);
    }

    const reviewResult = await query('SELECT * FROM reviews WHERE id = ? AND COALESCE(status, ?) = ?', [reviewId, 'approved', 'approved']);
    if (reviewResult.rows.length === 0) {
      logMonitor('PRODUCTS', 'NOT_FOUND', { reviewId });
      return createErrorResponse('NOT_FOUND', lang, 404);
    }

    await query(
      `INSERT OR REPLACE INTO review_helpful (review_id, user_id, is_helpful, created_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [reviewId, Number(authResult.user.userId), is_helpful ? 1 : 0]
    );

    await refreshReviewCounters(reviewId);
    const updated = await query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    const payload = await buildReviewPayload(updated.rows || [], lang, Number(authResult.user.userId));
    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'VOTE_REVIEW_HELPFUL',
      reviewId,
      userId: Number(authResult.user.userId),
      is_helpful,
    });

    return createSuccessResponse(payload[0]);
  } catch (error) {
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'VOTE_REVIEW_HELPFUL',
      reviewId,
      error: String(error),
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}
