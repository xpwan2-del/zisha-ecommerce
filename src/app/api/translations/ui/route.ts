import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * UI 翻译文本查询
 * ============================================================
 *
 * @api {GET} /api/translations/ui 获取 UI 翻译文本
 * @apiName GetUITranslations
 * @apiGroup TRANSLATIONS
 * @apiDescription 获取 UI 翻译文本，支持按语言和命名空间筛选
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiParam {String} [language] 语言筛选 (zh|en|ar)
 * @apiParam {String} [namespace] 命名空间筛选 (promotion|inventory|product)
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "promotion": {
 *           "final_discount": "最终折扣",
 *           "off_sale": "OFF SALE"
 *         }
 *       }
 *     }
 *
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

export async function GET(request: NextRequest) {
  const lang = getLangFromRequest(request);
  logMonitor('TRANSLATIONS', 'REQUEST', {
    method: 'GET',
    path: '/api/translations/ui',
    lang
  });

  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || lang;
    const namespace = searchParams.get('namespace');

    let sql = 'SELECT key, value FROM translations WHERE language = ?';
    const params: any[] = [language];

    if (namespace) {
      sql += ' AND key LIKE ?';
      params.push(`${namespace}.%`);
    }

    sql += ' ORDER BY key ASC';

    const result = await query(sql, params);

    const translations: Record<string, string> = {};
    if (result.rows) {
      result.rows.forEach((row: any) => {
        const keys = row.key.split('.');
        let current: any = translations;

        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = row.value;
      });
    }

    logMonitor('TRANSLATIONS', 'SUCCESS', {
      action: 'GET_UI_TRANSLATIONS',
      language,
      namespace: namespace || 'all',
      count: result.rows?.length || 0
    });

    return NextResponse.json({
      success: true,
      data: translations
    });

  } catch (error) {
    logMonitor('TRANSLATIONS', 'ERROR', {
      action: 'GET_UI_TRANSLATIONS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
