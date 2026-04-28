import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 获取当前用户信息
 * ============================================================
 *
 * @api {GET} /api/auth/me 获取当前登录用户信息
 * @apiName GetCurrentUser
 * @apiGroup Auth
 * @apiDescription 获取当前登录用户详细信息，需要有效的访问令牌
 *
 * **业务逻辑：**
 * 1. 从请求 Cookie 中提取访问令牌
 * 2. 验证令牌有效性
 * 3. 查询用户最新信息
 * 4. 返回用户资料
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 * @apiHeader {String} Authorization Bearer Token (自动从 Cookie 获取)
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} user 用户信息
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "user": { "id": 1, "name": "张三", "email": "test@example.com" }
 *       }
 *     }
 *
 * @apiError {String} UNAUTHORIZED 未登录或Token无效
 * @apiError {String} USER_NOT_FOUND 用户不存在
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 * @apiErrorExample {json} Error-Response:
 *     {
 *       "success": false,
 *       "error": "UNAUTHORIZED"
 *     }
 */

// ============================================================
// 辅助函数
// ============================================================

/**
 * getLangFromRequest - 从请求获取语言设置
 * @description 优先从请求头 x-lang 获取，其次从 cookie 获取，默认 zh
 */
function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

/**
 * createErrorResponse - 创建统一错误响应
 * @param error 错误码
 * @param lang 语言
 * @param status HTTP 状态码
 */
function createErrorResponse(error: string, lang: string, status: number = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

// ============================================================
// 接口实现
// ============================================================

export async function GET(request: NextRequest) {
  const lang = getLangFromRequest(request);

  // 监听：请求进入
  logMonitor('AUTH', 'REQUEST', {
    method: 'GET',
    path: '/api/auth/me',
    lang
  });

  try {
    // 1. 权限验证
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('AUTH', 'AUTH_FAILED', {
        reason: 'Invalid or expired token'
      });
      return authResult.response;
    }

    const currentUser = authResult.user;

    // 2. 查询用户
    const result = await query('SELECT * FROM users WHERE id = ?', [currentUser.userId]);

    if (result.rows.length === 0) {
      logMonitor('AUTH', 'NOT_FOUND', {
        userId: currentUser.userId,
        reason: 'User deleted but token valid'
      });
      return createErrorResponse('USER_NOT_FOUND', lang, 404);
    }

    const user = result.rows[0];

    // 3. 监听：获取成功
    logMonitor('AUTH', 'SUCCESS', {
      action: 'GET_CURRENT_USER',
      userId: user.id
    });

    // 4. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          level: user.level,
          points: user.points,
          total_spent: user.total_spent,
          referral_code: user.referral_code,
          created_at: user.created_at
        }
      }
    });

  } catch (error) {
    // 5. 监听：错误
    logMonitor('AUTH', 'ERROR', {
      action: 'GET_CURRENT_USER',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}
