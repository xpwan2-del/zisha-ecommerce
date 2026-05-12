import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { getMessage } from '@/lib/messages';
import { logMonitor } from '@/lib/utils/logger';

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') || request.cookies.get('locale')?.value || 'zh';
}

function createErrorResponse(error: string, lang: string, status: number = 400, extra: Record<string, any> = {}) {
  return NextResponse.json(
    { success: false, error, message: getMessage(error as any, lang), ...extra },
    { status }
  );
}

function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

function safeJsonParse<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (Array.isArray(value) || typeof value === 'object') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function recalculateReviewStats(productId: number) {
  const stats = await query(
    `SELECT
      COUNT(*) as review_count,
      COALESCE(AVG(rating), 0) as average_rating,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1_count,
      SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2_count,
      SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3_count,
      SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4_count,
      SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5_count,
      SUM(CASE WHEN images IS NOT NULL AND images <> '' AND images <> '[]' THEN 1 ELSE 0 END) as image_review_count
     FROM reviews
     WHERE product_id = ? AND COALESCE(status, 'approved') = 'approved'`,
    [productId]
  );

  const row = stats.rows[0] || {};
  await query(
    `INSERT OR REPLACE INTO product_review_stats (
      product_id, review_count, average_rating,
      rating_1_count, rating_2_count, rating_3_count, rating_4_count, rating_5_count,
      image_review_count, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      productId,
      Number(row.review_count || 0),
      Number(row.average_rating || 0),
      Number(row.rating_1_count || 0),
      Number(row.rating_2_count || 0),
      Number(row.rating_3_count || 0),
      Number(row.rating_4_count || 0),
      Number(row.rating_5_count || 0),
      Number(row.image_review_count || 0),
    ]
  );
}

async function refreshReviewCounters(reviewId: number) {
  const helpful = await query(
    `SELECT
      COALESCE(SUM(CASE WHEN is_helpful = 1 THEN 1 ELSE 0 END), 0) as helpful_count,
      COALESCE(SUM(CASE WHEN is_helpful = 0 THEN 1 ELSE 0 END), 0) as not_helpful_count
     FROM review_helpful
     WHERE review_id = ?`,
    [reviewId]
  );
  const replies = await query('SELECT COUNT(*) as count FROM review_replies WHERE review_id = ?', [reviewId]);
  const followUps = await query('SELECT COUNT(*) as count FROM review_follow_ups WHERE review_id = ? AND COALESCE(status, ?)= ?', [reviewId, 'approved', 'approved']);

  await query(
    `UPDATE reviews
     SET helpful_count = ?, not_helpful_count = ?, reply_count = ?, has_follow_up = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      Number(helpful.rows[0]?.helpful_count || 0),
      Number(helpful.rows[0]?.not_helpful_count || 0),
      Number(replies.rows[0]?.count || 0),
      Number(followUps.rows[0]?.count || 0) > 0 ? 1 : 0,
      reviewId,
    ]
  );
}

async function buildReviewPayload(reviewRows: any[], lang: string, currentUserId?: number | null) {
  if (reviewRows.length === 0) {
    return [];
  }

  const ids = reviewRows.map((review) => Number(review.id));
  const placeholders = ids.map(() => '?').join(',');
  const repliesPromise = query(
    `SELECT rr.*, u.name as user_name
     FROM review_replies rr
     LEFT JOIN users u ON rr.user_id = u.id
     WHERE rr.review_id IN (${placeholders})
     ORDER BY rr.created_at ASC`,
    ids
  );
  const followUpsPromise = query(
    `SELECT rf.*, u.name as user_name
     FROM review_follow_ups rf
     LEFT JOIN users u ON rf.user_id = u.id
     WHERE rf.review_id IN (${placeholders}) AND COALESCE(rf.status, 'approved') = 'approved'
     ORDER BY rf.created_at ASC`,
    ids
  );
  const myVotesPromise = currentUserId
    ? query(`SELECT review_id, is_helpful FROM review_helpful WHERE user_id = ? AND review_id IN (${placeholders})`, [currentUserId, ...ids])
    : Promise.resolve({ rows: [] as any[] });

  const [repliesResult, followUpsResult, myVotesResult] = await Promise.all([repliesPromise, followUpsPromise, myVotesPromise]);

  const repliesMap = new Map<number, any[]>();
  for (const reply of repliesResult.rows) {
    const list = repliesMap.get(Number(reply.review_id)) || [];
    list.push({
      ...reply,
      content: lang === 'en' && reply.content_en ? reply.content_en : lang === 'ar' && reply.content_ar ? reply.content_ar : reply.content,
    });
    repliesMap.set(Number(reply.review_id), list);
  }

  const followUpsMap = new Map<number, any[]>();
  for (const followUp of followUpsResult.rows) {
    const list = followUpsMap.get(Number(followUp.review_id)) || [];
    list.push({
      ...followUp,
      content: lang === 'en' && followUp.content_en ? followUp.content_en : lang === 'ar' && followUp.content_ar ? followUp.content_ar : followUp.content,
      images: safeJsonParse<string[]>(followUp.images, []),
    });
    followUpsMap.set(Number(followUp.review_id), list);
  }

  const myVotesMap = new Map<number, boolean>();
  for (const vote of myVotesResult.rows) {
    myVotesMap.set(Number(vote.review_id), Boolean(vote.is_helpful));
  }

  return reviewRows.map((review) => ({
    ...review,
    rating: Number(review.rating || 0),
    helpful_count: Number(review.helpful_count || 0),
    not_helpful_count: Number(review.not_helpful_count || 0),
    reply_count: Number(review.reply_count || 0),
    has_follow_up: Boolean(review.has_follow_up),
    is_anonymous: Boolean(review.is_anonymous),
    comment: lang === 'en' && review.comment_en ? review.comment_en : lang === 'ar' && review.comment_ar ? review.comment_ar : review.comment,
    images: safeJsonParse<string[]>(review.images, []),
    replies: repliesMap.get(Number(review.id)) || [],
    follow_ups: followUpsMap.get(Number(review.id)) || [],
    my_helpful_vote: myVotesMap.has(Number(review.id)) ? myVotesMap.get(Number(review.id)) : null,
  }));
}

export async function GET(request: NextRequest) {
  const lang = getLangFromRequest(request);
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'GET',
    path: '/api/reviews',
    query: Object.fromEntries(request.nextUrl.searchParams),
  });

  try {
    const productId = request.nextUrl.searchParams.get('product_id');
    const orderId = request.nextUrl.searchParams.get('order_id');
    const userId = request.nextUrl.searchParams.get('user_id');
    const limit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '20', 10)));

    let sql = `
      SELECT
        r.*,
        u.name as user_name,
        p.name as product_name,
        p.name_en as product_name_en,
        p.name_ar as product_name_ar,
        p.image as product_image,
        oi.quantity as order_quantity
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN order_items oi ON r.order_item_id = oi.id
      WHERE COALESCE(r.status, 'approved') = 'approved'
    `;
    const params: any[] = [];

    if (productId) {
      sql += ' AND r.product_id = ?';
      params.push(Number(productId));
    }
    if (orderId) {
      sql += ' AND r.order_id = ?';
      params.push(Number(orderId));
    }
    if (userId) {
      sql += ' AND r.user_id = ?';
      params.push(Number(userId));
    }

    sql += ' ORDER BY r.created_at DESC LIMIT ?';
    params.push(limit);

    const currentUser = requireAuth(request);
    const currentUserId = currentUser.user?.userId || null;
    const result = await query(sql, params);
    const reviews = await buildReviewPayload(result.rows || [], lang, currentUserId);

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'GET_REVIEWS',
      productId,
      orderId,
      count: reviews.length,
    });

    return createSuccessResponse(reviews);
  } catch (error) {
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'GET_REVIEWS',
      error: String(error),
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'POST',
    path: '/api/reviews',
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const userId = Number(authResult.user?.userId || 0);
    const body = await request.json();
    const { order_id, order_item_id, product_id, rating, comment, comment_en, comment_ar, images, is_anonymous } = body;

    if (!order_id || !order_item_id || !product_id || !rating || !comment) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'Missing required review fields',
        order_id,
        order_item_id,
        product_id,
      });
      return createErrorResponse('MISSING_PARAMS', lang, 400);
    }

    const normalizedRating = Number(rating);
    if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return createErrorResponse('INVALID_PARAMS', lang, 400);
    }

    const orderResult = await query(
      `SELECT
        o.id as order_id,
        o.order_status,
        oi.id as order_item_id,
        oi.product_id,
        oi.quantity,
        p.name as product_name
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.id = ? AND o.user_id = ? AND oi.id = ? AND oi.product_id = ?`,
      [Number(order_id), userId, Number(order_item_id), Number(product_id)]
    );

    if (orderResult.rows.length === 0) {
      logMonitor('PRODUCTS', 'NOT_FOUND', {
        reason: 'Order item not found for review',
        order_id,
        order_item_id,
        product_id,
        userId,
      });
      return createErrorResponse('ORDER_NOT_FOUND', lang, 404);
    }

    const orderItem = orderResult.rows[0];
    if (!['delivered', 'completed'].includes(String(orderItem.order_status))) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'Order status invalid for review',
        orderStatus: orderItem.order_status,
      });
      return createErrorResponse('INVALID_ORDER_STATUS', lang, 400);
    }

    const existing = await query(
      'SELECT id FROM reviews WHERE order_item_id = ? AND user_id = ?',
      [Number(order_item_id), userId]
    );
    if (existing.rows.length > 0) {
      return createErrorResponse('INVALID_ACTION', lang, 400, { detail: 'REVIEW_ALREADY_EXISTS' });
    }

    const insertResult = await query(
      `INSERT INTO reviews (
        product_id, user_id, rating, comment, comment_en, comment_ar, images,
        status, is_anonymous, order_id, order_item_id, helpful_count,
        not_helpful_count, reply_count, has_follow_up, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, CURRENT_TIMESTAMP)`,
      [
        Number(product_id),
        userId,
        normalizedRating,
        String(comment).trim(),
        comment_en || null,
        comment_ar || null,
        JSON.stringify(Array.isArray(images) ? images : []),
        'approved',
        is_anonymous ? 1 : 0,
        Number(order_id),
        Number(order_item_id),
      ]
    );

    await recalculateReviewStats(Number(product_id));

    const newReview = await query('SELECT * FROM reviews WHERE id = ?', [insertResult.lastInsertRowid]);
    const payload = await buildReviewPayload(newReview.rows || [], lang, userId);

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'CREATE_REVIEW',
      reviewId: insertResult.lastInsertRowid,
      orderId: Number(order_id),
      orderItemId: Number(order_item_id),
      productId: Number(product_id),
    });

    return createSuccessResponse(payload[0], 201);
  } catch (error) {
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'CREATE_REVIEW',
      error: String(error),
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}

export async function DELETE(request: NextRequest) {
  const lang = getLangFromRequest(request);
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'DELETE',
    path: '/api/reviews',
  });

  try {
    const adminResult = requireAdmin(request);
    if (adminResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Admin required' });
      return adminResult.response;
    }

    const products = await query('SELECT DISTINCT product_id FROM reviews WHERE product_id IS NOT NULL');
    await query('DELETE FROM review_replies');
    await query('DELETE FROM review_helpful');
    await query('DELETE FROM review_follow_ups');
    await query('DELETE FROM reviews');
    await query('DELETE FROM product_review_stats');

    for (const row of products.rows) {
      if (row.product_id) {
        await recalculateReviewStats(Number(row.product_id));
      }
    }

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'DELETE_ALL_REVIEWS',
      affectedProducts: products.rows.length,
    });

    return createSuccessResponse({ message: 'All reviews deleted successfully' });
  } catch (error) {
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'DELETE_ALL_REVIEWS',
      error: String(error),
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}

export { buildReviewPayload, createErrorResponse, createSuccessResponse, getLangFromRequest, recalculateReviewStats, refreshReviewCounters, safeJsonParse };
