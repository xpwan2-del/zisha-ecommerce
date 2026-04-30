import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 翻译数据导出 - 导出翻译为JSON或CSV格式
 * ============================================================
 *
 * @api {GET} /api/translations/export 导出翻译数据
 * @apiName ExportTranslations
 * @apiGroup TRANSLATIONS
 * @apiDescription 导出翻译数据为JSON或CSV格式
 *
 * @apiHeader {String} Authorization Bearer Token 管理员认证凭证
 *
 * @apiQuery {String} format 导出格式 (json|csv) 默认: json
 * @apiQuery {String} language 导出语言 (all|zh|en|ar) 默认: all
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "format": "json",
 *         "count": 250,
 *         "translations": {
 *           "nav.home": { "zh": "首页", "en": "Home", "ar": "الصفحة الرئيسية" }
 *         }
 *       }
 *     }
 *
 * @apiSuccessExample {csv} CSV-Response:
 *     key,zh,en,ar
 *     nav.home,首页,Home,الصفحة الرئيسية
 *
 * @apiError {String} UNAUTHORIZED 未登录或非管理员
 */

interface TranslationRow {
  key: string;
  language: string;
  value: string;
}

interface TranslationMap {
  [key: string]: {
    zh?: string;
    en?: string;
    ar?: string;
  };
}

function convertToCSV(translations: TranslationMap): string {
  const headers = ['key', 'zh', 'en', 'ar'];
  const rows = [headers.join(',')];

  for (const [key, values] of Object.entries(translations)) {
    const row = [
      `"${key}"`,
      `"${values.zh || ''}"`,
      `"${values.en || ''}"`,
      `"${values.ar || ''}"`
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

function convertToNestedJSON(flatTranslations: TranslationMap): object {
  const result: { [key: string]: any } = {};

  for (const [fullKey, values] of Object.entries(flatTranslations)) {
    const keys = fullKey.split('.');
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k]) {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = values;
  }

  return result;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const language = searchParams.get('language') || 'all';

  logMonitor('TRANSLATIONS', 'REQUEST', {
    method: 'GET',
    path: '/api/translations/export',
    params: { format, language }
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('TRANSLATIONS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const userId = authResult.user?.userId;

    let sql = 'SELECT key, language, value FROM translations';
    const params: string[] = [];

    if (language !== 'all') {
      sql += ' WHERE language = ?';
      params.push(language);
    }

    sql += ' ORDER BY key, language';

    const result = await query(sql, params);
    const rows = result.rows as TranslationRow[];

    const translations: TranslationMap = {};

    for (const row of rows) {
      if (!translations[row.key]) {
        translations[row.key] = {};
      }
      translations[row.key][row.language] = row.value;
    }

    logMonitor('TRANSLATIONS', 'SUCCESS', {
      action: 'EXPORT_TRANSLATIONS',
      userId,
      format,
      language,
      count: Object.keys(translations).length
    });

    if (format === 'csv') {
      const csv = convertToCSV(translations);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="translations-${language}-${Date.now()}.csv"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        format: 'json',
        language,
        count: Object.keys(translations).length,
        translations: convertToNestedJSON(translations)
      }
    });
  } catch (error) {
    console.error('Error exporting translations:', error);
    logMonitor('TRANSLATIONS', 'ERROR', {
      action: 'EXPORT_TRANSLATIONS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to export translations' },
      { status: 500 }
    );
  }
}
