import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 管理员优惠券管理
 * ============================================================
 *
 * @api {POST} /api/admin/coupons 创建优惠券
 * @apiName CreateCoupon
 * @apiGroup AdminCoupons
 * @apiDescription 管理员创建新优惠券
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiParam {String} code 优惠券代码，必需，唯一
 * @apiParam {String} name 优惠券名称，必需
 * @apiParam {String} type 折扣类型，必需 (percentage=百分比, fixed=固定金额)
 * @apiParam {Number} value 折扣值，必需
 * @apiParam {String} start_date 开始日期，必需 (YYYY-MM-DD HH:mm:ss)
 * @apiParam {String} end_date 结束日期，必需 (YYYY-MM-DD HH:mm:ss)
 * @apiParam {Number} [usage_limit] 全局领取上限
 * @apiParam {Boolean} [is_permanent=false] 是否永久有效
 * @apiParam {Number} [permanent_days=0] 有效天数（is_permanent=false时生效）
 * @apiParam {Boolean} [is_stackable=false] 是否可叠加使用
 * @apiParam {Boolean} [is_active=true] 是否激活
 * @apiParam {String} [description] 优惠券描述
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "id": 22,
 *         "code": "NEWCOUPON",
 *         "name": "新优惠券"
 *       }
 *     }
 *
 * @apiError {String} VALIDATION_FAILED 参数验证失败
 * @apiError {String} DUPLICATE_CODE 优惠券代码已存在
 * @apiError {String} INVALID_TYPE 无效的折扣类型
 * @apiError {String} INVALID_DATE 日期范围无效
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

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('ORDERS', 'REQUEST', {
    method: 'POST',
    path: '/api/admin/coupons'
  });

  try {
    const body = await request.json();
    const {
      code,
      name,
      type,
      value,
      start_date,
      end_date,
      usage_limit = null,
      is_permanent = false,
      permanent_days = 0,
      is_stackable = false,
      is_active = true,
      description = null
    } = body;

    if (!code || typeof code !== 'string' || code.trim() === '') {
      logMonitor('ORDERS', 'VALIDATION_FAILED', { reason: 'Missing required field: code' });
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      logMonitor('ORDERS', 'VALIDATION_FAILED', { reason: 'Missing required field: name' });
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    if (!type || (type !== 'percentage' && type !== 'fixed')) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', { reason: 'Invalid type, must be percentage or fixed' });
      return createErrorResponse('INVALID_TYPE', 400);
    }

    if (typeof value !== 'number' || value <= 0) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', { reason: 'Invalid value, must be a positive number' });
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    if (type === 'percentage' && value > 100) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', { reason: 'Percentage value cannot exceed 100' });
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    if (!start_date || !end_date) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', { reason: 'Missing required fields: start_date or end_date' });
      return createErrorResponse('VALIDATION_FAILED', 400);
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', { reason: 'Invalid date format' });
      return createErrorResponse('INVALID_DATE', 400);
    }

    if (endDateObj <= startDateObj) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', { reason: 'end_date must be after start_date' });
      return createErrorResponse('INVALID_DATE', 400);
    }

    const checkResult = await query(
      'SELECT id FROM coupons WHERE code = ?',
      [code.trim()]
    );

    if ((checkResult.rows?.length || 0) > 0) {
      logMonitor('ORDERS', 'VALIDATION_FAILED', { reason: 'Coupon code already exists', code });
      return createErrorResponse('DUPLICATE_CODE', 400);
    }

    const insertResult = await query(`
      INSERT INTO coupons (
        code, name, type, value,
        start_date, end_date, usage_limit, is_permanent,
        permanent_days, is_stackable, is_active, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      code.trim(),
      name.trim(),
      type,
      value,
      start_date,
      end_date,
      usage_limit,
      is_permanent ? 1 : 0,
      permanent_days,
      is_stackable ? 1 : 0,
      is_active ? 1 : 0,
      description
    ]);

    logMonitor('ORDERS', 'SUCCESS', {
      action: 'CREATE_COUPON',
      couponId: insertResult.lastInsertRowid,
      code: code.trim()
    });

    return createSuccessResponse({
      id: insertResult.lastInsertRowid,
      code: code.trim(),
      name: name.trim()
    }, 201);

  } catch (error) {
    console.error('Error creating coupon:', error);
    logMonitor('ORDERS', 'ERROR', {
      action: 'CREATE_COUPON',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
