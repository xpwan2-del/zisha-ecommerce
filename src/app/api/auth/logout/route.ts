import { NextRequest, NextResponse } from 'next/server';
import { logMonitor } from '@/lib/utils/logger';

/**
 * @api {POST} /api/auth/logout 用户登出
 * @apiName Logout
 * @apiGroup Auth
 * @apiDescription 删除用户登录凭证，清理 Cookie
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "message": "登出成功"
 *       }
 *     }
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

function createErrorResponse(error: string, lang: string, status: number = 400) {
  return NextResponse.json({ success: false, error }, { status });
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
    path: '/api/auth/logout'
  });

  try {
    const response = createSuccessResponse({
      message: lang === 'zh' ? '登出成功' : lang === 'ar' ? 'تم تسجيل الخروج' : 'Logout successful'
    });

    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');

    logMonitor('AUTH', 'SUCCESS', {
      action: 'LOGOUT_SUCCESS'
    });

    return response;
  } catch (error) {
    logMonitor('AUTH', 'ERROR', {
      action: 'LOGOUT_FAILED',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}