import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { getMessage } from '@/lib/messages';
import { logMonitor } from '@/lib/utils/logger';

const isProduction = process.env.NODE_ENV === 'production';

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge,
    path: '/',
  } as const;
}

/**
 * @api {POST} /api/auth/refresh 刷新访问令牌
 * @apiName RefreshToken
 * @apiGroup Auth
 * @apiDescription 使用 refresh_token 刷新 access_token
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "message": "令牌刷新成功"
 *       }
 *     }
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

function createErrorResponse(error: string, lang: string, status: number = 400) {
  return NextResponse.json(
    { success: false, error, message: getMessage(error as any, lang) },
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

  logMonitor('AUTH', 'REQUEST', {
    method: 'POST',
    path: '/api/auth/refresh'
  });

  try {
    let refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      const body = await request.json().catch(() => ({}));
      refreshToken = body.refresh_token;
    }

    if (!refreshToken) {
      logMonitor('AUTH', 'VALIDATION_FAILED', {
        reason: 'REFRESH_TOKEN_REQUIRED'
      });
      return createErrorResponse('REFRESH_TOKEN_REQUIRED', lang, 400);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
    } catch (error) {
      logMonitor('AUTH', 'VALIDATION_FAILED', {
        reason: 'INVALID_REFRESH_TOKEN'
      });
      return createErrorResponse('INVALID_REFRESH_TOKEN', lang, 401);
    }

    const result = await query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    if (result.rows.length === 0) {
      logMonitor('AUTH', 'NOT_FOUND', {
        reason: 'USER_NOT_FOUND',
        userId: decoded.userId
      });
      return createErrorResponse('USER_NOT_FOUND', lang, 404);
    }

    const user = result.rows[0];

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '2h' }
    );

    const response = createSuccessResponse({
      message: lang === 'zh' ? '令牌刷新成功' : lang === 'ar' ? 'تم تجديد الرمز المميز' : 'Token refreshed successfully'
    });

    response.cookies.set('access_token', accessToken, cookieOptions(60 * 60 * 2));

    logMonitor('AUTH', 'SUCCESS', {
      action: 'REFRESH_SUCCESS',
      userId: user.id
    });

    return response;
  } catch (error) {
    logMonitor('AUTH', 'ERROR', {
      action: 'REFRESH_FAILED',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}