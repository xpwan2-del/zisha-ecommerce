import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 用户登录
 * ============================================================
 *
 * @api {POST} /api/auth/login 用户登录
 * @apiName Login
 * @apiGroup Auth
 * @apiDescription 用户登录验证，返回JWT Token和用户信息
 *
 * **业务逻辑：**
 * 1. 接收 email 和 password
 * 2. 查询用户是否存在
 * 3. 验证密码是否正确
 * 4. 生成 access_token 和 refresh_token
 * 5. 设置 Cookie 并返回用户信息
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiParam {String} email 用户邮箱，必需
 * @apiParam {String} password 用户密码，必需
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
 * @apiError {String} INVALID_CREDENTIALS 邮箱或密码错误
 * @apiError {String} MISSING_PARAMS 缺少必需参数
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 * @apiErrorExample {json} Error-Response:
 *     {
 *       "success": false,
 *       "error": "INVALID_CREDENTIALS"
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

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  // 监听：请求进入
  logMonitor('AUTH', 'REQUEST', {
    method: 'POST',
    path: '/api/auth/login',
    lang
  });

  try {
    // 1. 获取参数
    const body = await request.json();
    const { email, password } = body;

    // 2. 参数校验
    if (!email || !password) {
      logMonitor('AUTH', 'VALIDATION_FAILED', {
        reason: 'Missing required fields',
        fields: { email: !!email, password: !!password }
      });
      return createErrorResponse('MISSING_PARAMS', lang, 400);
    }

    // 3. 查询用户
    const result = await query('SELECT * FROM users WHERE email = ?', [email]);

    if (result.rows.length === 0) {
      logMonitor('AUTH', 'AUTH_FAILED', {
        reason: 'User not found',
        emailPrefix: email.substring(0, 3)
      });
      return createErrorResponse('INVALID_CREDENTIALS', lang, 401);
    }

    const user = result.rows[0];

    // 4. 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logMonitor('AUTH', 'AUTH_FAILED', {
        reason: 'Invalid password',
        userId: user.id
      });
      return createErrorResponse('INVALID_CREDENTIALS', lang, 401);
    }

    // 5. 生成 Token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '2h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    // 6. 构建响应
    const response = NextResponse.json({
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

    // 7. 设置 Cookie
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 2,
      path: '/'
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/'
    });

    // 8. 监听：登录成功
    logMonitor('AUTH', 'SUCCESS', {
      action: 'LOGIN_SUCCESS',
      userId: user.id,
      emailPrefix: email.substring(0, 3)
    });

    return response;

  } catch (error) {
    // 9. 监听：错误
    logMonitor('AUTH', 'ERROR', {
      action: 'LOGIN',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}
