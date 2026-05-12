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
    path: `/api/reviews/${reviewId}/follow-up`,
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
    const { content, content_en, content_ar, images } = body;
    if (!content || !String(content).trim()) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'Missing follow-up content',
        reviewId,
      });
      return createErrorResponse('MISSING_PARAMS', lang, 400);
    }

    const reviewResult = await query(
      `SELECT r.*, o.order_status
       FROM reviews r
       LEFT JOIN orders o ON r.order_id = o.id
       WHERE r.id = ? AND r.user_id = ? AND COALESCE(r.status, ?) = ?`,
      [reviewId, Number(authResult.user.userId), 'approved', 'approved']
    );
    if (reviewResult.rows.length === 0) {
      logMonitor('PRODUCTS', 'NOT_FOUND', { reviewId });
      return createErrorResponse('NOT_FOUND', lang, 404);
    }

    const review = reviewResult.rows[0];
    if (!['delivered', 'completed'].includes(String(review.order_status))) {
      return createErrorResponse('INVALID_ORDER_STATUS', lang, 400);
    }

    await query(
      `INSERT INTO review_follow_ups (review_id, user_id, content, content_en, content_ar, images, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        reviewId,
        Number(authResult.user.userId),
        String(content).trim(),
        content_en || null,
        content_ar || null,
        JSON.stringify(Array.isArray(images) ? images : []),
      ]
    );

    await refreshReviewCounters(reviewId);
    const updated = await query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    const payload = await buildReviewPayload(updated.rows || [], lang, Number(authResult.user.userId));
    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'CREATE_REVIEW_FOLLOW_UP',
      reviewId,
      userId: Number(authResult.user.userId),
    });

    return createSuccessResponse(payload[0]);
  } catch (error) {
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'CREATE_REVIEW_FOLLOW_UP',
      reviewId,
      error: String(error),
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}
