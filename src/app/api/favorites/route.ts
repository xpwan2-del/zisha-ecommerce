import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 收藏夹管理
 * ============================================================
 *
 * @api {GET} /api/favorites 获取收藏列表或检查收藏状态
 * @apiName GetFavorites
 * @apiGroup PRODUCTS
 * @apiDescription 获取用户收藏的商品列表，或检查指定商品是否已收藏
 *
 * @api {POST} /api/favorites 添加收藏
 * @apiName AddFavorite
 * @apiGroup PRODUCTS
 * @apiDescription 添加商品到收藏夹
 *
 * @api {DELETE} /api/favorites 删除收藏
 * @apiName DeleteFavorite
 * @apiGroup PRODUCTS
 * @apiDescription 从收藏夹移除商品
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 * @apiHeader {String} Authorization Bearer Token 用户认证凭证
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} UNAUTHORIZED 未登录或Token无效
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

export async function GET(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'GET',
    path: '/api/favorites'
  });

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const user_id = authResult.user?.userId;
    logMonitor('PRODUCTS', 'INFO', {
      action: 'GET_FAVORITES',
      userId: user_id,
      productId
    });

    if (productId) {
      const result = await query(
        'SELECT id FROM user_favorites WHERE user_id = ? AND product_id = ?',
        [user_id, productId]
      );

      logMonitor('PRODUCTS', 'SUCCESS', {
        action: 'CHECK_FAVORITE',
        userId: user_id,
        productId: parseInt(productId),
        isFavorited: result.rows.length > 0
      });

      return NextResponse.json({
        success: true,
        data: { isFavorited: result.rows.length > 0, favoriteId: result.rows[0]?.id }
      });
    }

    const result = await query(
      `SELECT uf.id, uf.product_id, uf.created_at, p.name, p.name_en, p.name_ar, p.image,
              pp_usd.price as price_usd, pp_cny.price as price_cny, pp_aed.price as price_aed
       FROM user_favorites uf
       LEFT JOIN products p ON uf.product_id = p.id
       LEFT JOIN product_prices pp_usd ON p.id = pp_usd.product_id AND pp_usd.currency = 'USD'
       LEFT JOIN product_prices pp_cny ON p.id = pp_cny.product_id AND pp_cny.currency = 'CNY'
       LEFT JOIN product_prices pp_aed ON p.id = pp_aed.product_id AND pp_aed.currency = 'AED'
       WHERE uf.user_id = ?
       ORDER BY uf.created_at DESC`,
      [user_id]
    );

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'GET_FAVORITES',
      userId: user_id,
      count: result.rows.length
    });

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'GET_FAVORITES',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'POST',
    path: '/api/favorites'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const user_id = authResult.user?.userId;
    const { product_id } = await request.json();

    if (!product_id) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'Missing required field: product_id'
      });
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    logMonitor('PRODUCTS', 'INFO', {
      action: 'ADD_FAVORITE',
      userId: user_id,
      productId: product_id
    });

    const existingResult = await query(
      'SELECT id FROM user_favorites WHERE user_id = ? AND product_id = ?',
      [user_id, product_id]
    );

    if (existingResult.rows.length > 0) {
      logMonitor('PRODUCTS', 'SUCCESS', {
        action: 'ADD_FAVORITE',
        userId: user_id,
        productId: product_id,
        status: 'already_exists'
      });
      return NextResponse.json({
        success: true,
        data: { message: 'Already favorited', favoriteId: existingResult.rows[0].id }
      });
    }

    const insertResult = await query(
      'INSERT INTO user_favorites (user_id, product_id) VALUES (?, ?)',
      [user_id, product_id]
    );

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'ADD_FAVORITE',
      userId: user_id,
      productId: product_id,
      favoriteId: insertResult.lastInsertRowid
    });

    return NextResponse.json({
      success: true,
      data: { favoriteId: insertResult.lastInsertRowid }
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding favorite:', error);
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'ADD_FAVORITE',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'DELETE',
    path: '/api/favorites'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const user_id = authResult.user?.userId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const productId = searchParams.get('product_id');

    if (!id && !productId) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'Missing required field: id or product_id'
      });
      return NextResponse.json(
        { success: false, error: 'Favorite ID or Product ID is required' },
        { status: 400 }
      );
    }

    logMonitor('PRODUCTS', 'INFO', {
      action: 'DELETE_FAVORITE',
      userId: user_id,
      favoriteId: id,
      productId
    });

    let deleteResult;
    if (id) {
      deleteResult = await query(
        'DELETE FROM user_favorites WHERE id = ? AND user_id = ?',
        [id, user_id]
      );
    } else {
      deleteResult = await query(
        'DELETE FROM user_favorites WHERE product_id = ? AND user_id = ?',
        [productId, user_id]
      );
    }

    if (!deleteResult.changes || deleteResult.changes === 0) {
      logMonitor('PRODUCTS', 'NOT_FOUND', {
        reason: 'Favorite not found',
        favoriteId: id,
        productId
      });
      return NextResponse.json(
        { success: false, error: 'Favorite not found' },
        { status: 404 }
      );
    }

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'DELETE_FAVORITE',
      userId: user_id,
      favoriteId: id,
      productId
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Favorite removed' }
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'DELETE_FAVORITE',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}