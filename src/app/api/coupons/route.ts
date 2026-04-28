import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 优惠券管理
 * ============================================================
 *
 * @api {GET} /api/coupons 获取用户优惠券列表
 * @apiName GetUserCoupons
 * @apiGroup PROMOTIONS
 * @apiDescription 获取当前用户的优惠券列表，支持筛选状态
 *
 * @api {POST} /api/coupons 领取优惠券
 * @apiName ReceiveCoupon
 * @apiGroup PROMOTIONS
 * @apiDescription 用户领取指定优惠券
 *
 * @apiHeader {String} x-user-id 用户ID
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiParam {String} [status] 筛选状态 all=所有 active=可用 used=已使用 expired=已过期
 * @apiParam {Number} [page=1] 页码
 * @apiParam {Number} [limit=20] 每页数量
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} UNAUTHORIZED 未登录或Token无效
 * @apiError {String} VALIDATION_FAILED 参数验证失败
 * @apiError {String} COUPON_NOT_AVAILABLE 优惠券不可用或已过期
 * @apiError {String} ALREADY_CLAIMED 已领取过该优惠券
 * @apiError {String} LIMIT_REACHED 领取次数已达上限
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

function createErrorResponse(error: string, status: number = 400) {
  return NextResponse.json(
    { success: false, error },
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

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const lang = getLangFromRequest(request);
  const { searchParams } = new URL(request.url);

  const status = searchParams.get('status') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  logMonitor('PROMOTIONS', 'REQUEST', {
    method: 'GET',
    path: '/api/coupons',
    params: { status, page, limit }
  });

  try {
    if (!userId) {
      logMonitor('PROMOTIONS', 'AUTH_FAILED', { reason: 'User not authenticated' });
      return createErrorResponse('UNAUTHORIZED', 401);
    }

    if (status === 'available') {
      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM coupons c
        WHERE c.is_active = 1
        AND c.id NOT IN (SELECT coupon_id FROM user_coupons WHERE user_id = ?)
        AND c.end_date >= datetime('now')
      `, [userId]);

      const total = countResult.rows?.[0]?.total || 0;

      const result = await query(`
        SELECT
          c.id,
          c.code,
          c.name,
          c.type,
          c.value,
          c.is_permanent,
          c.permanent_days,
          c.is_stackable,
          CASE WHEN c.is_stackable = 1 THEN '可叠加' ELSE '不可叠加' END as stackable_text,
          c.description,
          c.start_date,
          c.end_date,
          c.is_active
        FROM coupons c
        WHERE c.is_active = 1
        AND c.start_date <= datetime('now')
        AND c.end_date >= datetime('now')
        AND c.id NOT IN (SELECT coupon_id FROM user_coupons WHERE user_id = ?)
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, limit, offset]);

      logMonitor('PROMOTIONS', 'SUCCESS', {
        action: 'GET_AVAILABLE_COUPONS',
        userId,
        count: result.rows?.length || 0,
        total
      });

      return createSuccessResponse({
        available_coupons: result.rows || [],
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      });
    }

    let whereClause = 'WHERE uc.user_id = ?';
    const params: any[] = [userId];

    if (status === 'used') {
      whereClause += " AND uc.status = 'used'";
    } else if (status === 'active') {
      whereClause += " AND uc.status = 'active' AND (c.is_permanent = 1 OR datetime('now') < uc.expires_at) AND c.is_active = 1";
    } else if (status === 'expired') {
      whereClause += " AND uc.status = 'active' AND datetime('now') >= uc.expires_at AND (c.is_permanent = 0 OR c.is_permanent IS NULL)";
    }

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      ${whereClause}
    `, params);

    const total = countResult.rows?.[0]?.total || 0;

    const result = await query(`
      SELECT
        uc.id,
        uc.user_id,
        uc.coupon_id,
        uc.status as user_coupon_status,
        uc.expires_at,
        uc.received_at,
        uc.used_order_id,
        c.code,
        c.name,
        c.type,
        c.value,
        c.is_permanent,
        c.permanent_days,
        c.is_stackable,
        CASE WHEN c.is_stackable = 1 THEN '可叠加' ELSE '不可叠加' END as stackable_text,
        c.description,
        c.start_date,
        c.end_date,
        c.is_active,
        CASE
          WHEN c.is_permanent = 1 THEN 0
          WHEN datetime('now') >= uc.expires_at THEN 1
          ELSE 0
        END as is_expired
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      ${whereClause}
      ORDER BY
        CASE uc.status
          WHEN 'active' THEN 1
          WHEN 'used' THEN 2
          ELSE 3
        END,
        uc.received_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    logMonitor('PROMOTIONS', 'SUCCESS', {
      action: 'GET_USER_COUPONS',
      userId,
      status,
      count: result.rows?.length || 0,
      total
    });

    return createSuccessResponse({
      user_coupons: result.rows || [],
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user coupons:', error);
    logMonitor('PROMOTIONS', 'ERROR', {
      action: 'GET_USER_COUPONS',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const lang = getLangFromRequest(request);

  logMonitor('PROMOTIONS', 'REQUEST', {
    method: 'POST',
    path: '/api/coupons'
  });

  try {
    if (!userId) {
      logMonitor('PROMOTIONS', 'AUTH_FAILED', { reason: 'User not authenticated' });
      return createErrorResponse('UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const { coupon_id } = body;

    if (!coupon_id) {
      logMonitor('PROMOTIONS', 'VALIDATION_FAILED', {
        reason: 'Missing required field: coupon_id'
      });
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    logMonitor('PROMOTIONS', 'INFO', {
      action: 'RECEIVE_COUPON',
      userId,
      couponId: coupon_id
    });

    const couponResult = await query(`
      SELECT * FROM coupons
      WHERE id = ? AND is_active = 1
    `, [coupon_id]);

    if (couponResult.rows.length === 0) {
      logMonitor('PROMOTIONS', 'VALIDATION_FAILED', {
        reason: 'Coupon not found or inactive',
        couponId: coupon_id
      });
      return createErrorResponse('COUPON_NOT_AVAILABLE', 400);
    }

    const coupon = couponResult.rows[0];

    if (new Date() < new Date(coupon.start_date)) {
      logMonitor('PROMOTIONS', 'VALIDATION_FAILED', {
        reason: 'Coupon not yet available',
        couponId: coupon_id,
        startDate: coupon.start_date
      });
      return createErrorResponse('COUPON_NOT_AVAILABLE', 400);
    }

    if (new Date() > new Date(coupon.end_date)) {
      logMonitor('PROMOTIONS', 'VALIDATION_FAILED', {
        reason: 'Coupon has expired',
        couponId: coupon_id,
        endDate: coupon.end_date
      });
      return createErrorResponse('COUPON_EXPIRED', 400);
    }

    const userCouponResult = await query(`
      SELECT * FROM user_coupons
      WHERE user_id = ? AND coupon_id = ?
    `, [userId, coupon_id]);

    if (userCouponResult.rows.length > 0) {
      logMonitor('PROMOTIONS', 'VALIDATION_FAILED', {
        reason: 'Already have this coupon',
        userId,
        couponId: coupon_id
      });
      return createErrorResponse('ALREADY_CLAIMED', 400);
    }

    const globalCountResult = await query(`
      SELECT COUNT(*) as count FROM user_coupons WHERE coupon_id = ?
    `, [coupon_id]);

    if (coupon.usage_limit && globalCountResult.rows[0].count >= coupon.usage_limit) {
      logMonitor('PROMOTIONS', 'VALIDATION_FAILED', {
        reason: 'Coupon fully claimed',
        couponId: coupon_id,
        limit: coupon.usage_limit
      });
      return createErrorResponse('LIMIT_REACHED', 400);
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    let expiresAt: string;

    if (coupon.is_permanent === 1) {
      expiresAt = '9999-12-31 23:59:59';
    } else {
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + coupon.permanent_days);
      expiresAt = expiresDate.toISOString().replace('T', ' ').slice(0, 19);
    }

    const insertResult = await query(`
      INSERT INTO user_coupons (user_id, coupon_id, status, expires_at, received_at)
      VALUES (?, ?, 'active', ?, ?)
    `, [userId, coupon_id, expiresAt, now]);

    logMonitor('PROMOTIONS', 'SUCCESS', {
      action: 'RECEIVE_COUPON',
      userId,
      couponId: coupon_id,
      couponCode: coupon.code,
      expiresAt
    });

    return createSuccessResponse({
      user_coupon_id: insertResult.lastInsertRowid,
      coupon_id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      type: coupon.type,
      value: coupon.value,
      expires_at: expiresAt,
      received_at: now
    }, 201);
  } catch (error) {
    console.error('Error receiving coupon:', error);
    logMonitor('PROMOTIONS', 'ERROR', {
      action: 'RECEIVE_COUPON',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
