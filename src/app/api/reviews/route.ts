import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 商品评价管理
 * ============================================================
 *
 * @api {GET} /api/reviews 获取评价列表
 * @apiName GetReviews
 * @apiGroup PRODUCTS
 * @apiDescription 获取商品评价列表，支持按商品筛选
 *
 * @api {POST} /api/reviews 创建评价
 * @apiName CreateReview
 * @apiGroup PRODUCTS
 * @apiDescription 为商品创建评价（需要登录）
 *
 * @api {DELETE} /api/reviews 删除所有评价
 * @apiName DeleteAllReviews
 * @apiGroup PRODUCTS
 * @apiDescription 清空所有评价（仅管理员）
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 * @apiHeader {String} Authorization Bearer Token 用户认证凭证
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} UNAUTHORIZED 未登录或Token无效
 * @apiError {String} FORBIDDEN 需要管理员权限
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

// GET /api/reviews - Get all reviews
export async function GET(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'GET',
    path: '/api/reviews'
  });

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const lang = searchParams.get('lang') || 'zh';
    const limit = parseInt(searchParams.get('limit') || '20');

    logMonitor('PRODUCTS', 'INFO', {
      action: 'GET_REVIEWS',
      productId,
      lang,
      limit
    });

    let sql = `
      SELECT
        r.id,
        r.rating,
        r.comment,
        r.comment_en,
        r.comment_ar,
        r.images,
        r.created_at,
        u.name as user_name,
        p.name as product_name,
        p.name_en as product_name_en,
        p.name_ar as product_name_ar,
        p.image as product_image,
        pp_usd.price as product_price_usd,
        pp_cny.price as product_price_cny,
        pp_aed.price as product_price_aed
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN product_prices pp_usd ON p.id = pp_usd.product_id AND pp_usd.currency = 'USD'
      LEFT JOIN product_prices pp_cny ON p.id = pp_cny.product_id AND pp_cny.currency = 'CNY'
      LEFT JOIN product_prices pp_aed ON p.id = pp_aed.product_id AND pp_aed.currency = 'AED'
    `;

    const params: any[] = [];

    if (productId) {
      sql += ' WHERE r.product_id = ?';
      params.push(productId);
    }

    sql += ' ORDER BY r.created_at DESC LIMIT ?';
    params.push(limit);

    const result = await query(sql, params);

    const reviews = result.rows.map((review: any) => {
      let comment = review.comment;
      if (lang === 'en' && review.comment_en) {
        comment = review.comment_en;
      } else if (lang === 'ar' && review.comment_ar) {
        comment = review.comment_ar;
      }

      return {
        ...review,
        rating: parseFloat(review.rating) || 0,
        comment,
        images: typeof review.images === 'string' ? JSON.parse(review.images) : review.images || [],
        product: review.product_name ? {
          id: review.product_id,
          name: lang === 'en' ? review.product_name_en : lang === 'ar' ? review.product_name_ar : review.product_name,
          image: review.product_image,
          price: parseFloat(review.product_price) || 0
        } : null
      };
    });

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'GET_REVIEWS',
      productId,
      count: reviews.length
    });

    return NextResponse.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'GET_REVIEWS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create a new review
export async function POST(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'POST',
    path: '/api/reviews'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const data = await request.json();
    const { product_id, rating, comment, comment_en, comment_ar, images } = data;

    if (!product_id || !rating) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'Missing required fields',
        required: ['product_id', 'rating']
      });
      return NextResponse.json(
        { success: false, error: 'Product ID and rating are required' },
        { status: 400 }
      );
    }

    const user_id = authResult.user?.userId;
    logMonitor('PRODUCTS', 'INFO', {
      action: 'CREATE_REVIEW',
      userId: user_id,
      productId: product_id,
      rating
    });

    const insertResult = await query(
      'INSERT INTO reviews (product_id, user_id, rating, comment, comment_en, comment_ar, images) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [product_id, user_id, rating, comment, comment_en, comment_ar, JSON.stringify(images || [])]
    );

    const newReview = await query('SELECT * FROM reviews WHERE id = ?', [insertResult.lastInsertRowid]);

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'CREATE_REVIEW',
      userId: user_id,
      productId: product_id,
      reviewId: insertResult.lastInsertRowid
    });

    return NextResponse.json({
      success: true,
      data: newReview.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'CREATE_REVIEW',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews - Delete all reviews (admin only)
export async function DELETE(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'DELETE',
    path: '/api/reviews'
  });

  try {
    const adminResult = requireAdmin(request);
    if (adminResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Admin required' });
      return adminResult.response;
    }

    logMonitor('PRODUCTS', 'INFO', {
      action: 'DELETE_ALL_REVIEWS'
    });

    await query('DELETE FROM reviews');

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'DELETE_ALL_REVIEWS'
    });

    return NextResponse.json({
      success: true,
      data: { message: 'All reviews deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting reviews:', error);
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'DELETE_ALL_REVIEWS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to delete reviews' },
      { status: 500 }
    );
  }
}
