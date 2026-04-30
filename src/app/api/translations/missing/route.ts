import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 翻译缺失检测 - 检测三种语言的翻译完整性
 * ============================================================
 *
 * @api {GET} /api/translations/missing 检测缺失翻译
 * @apiName GetMissingTranslations
 * @apiGroup TRANSLATIONS
 * @apiDescription 检测三种语言翻译的完整性，返回缺失的翻译项
 *
 * @apiHeader {String} Authorization Bearer Token 管理员认证凭证
 *
 * @apiQuery {String} language 检测特定语言 (zh|en|ar|all) 默认: all
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "total_keys": 250,
 *         "complete": 248,
 *         "missing": 2,
 *         "missing_list": [
 *           { "key": "nav.reviews", "zh": "✅", "en": "✅", "ar": "❌" },
 *           { "key": "cart.promo", "zh": "✅", "en": "❌", "ar": "❌" }
 *         ],
 *         "by_language": {
 *           "zh": { "total": 250, "missing": 0 },
 *           "en": { "total": 248, "missing": 2 },
 *           "ar": { "total": 248, "missing": 2 }
 *         }
 *       }
 *     }
 *
 * @apiError {String} UNAUTHORIZED 未登录或非管理员
 */

interface TranslationRow {
  key: string;
  language: string;
  value: string;
}

interface MissingItem {
  key: string;
  zh: string;
  en: string;
  ar: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filterLanguage = searchParams.get('language') || 'all';

  logMonitor('TRANSLATIONS', 'REQUEST', {
    method: 'GET',
    path: '/api/translations/missing',
    params: { language: filterLanguage }
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('TRANSLATIONS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const userId = authResult.user?.userId;

    const result = await query('SELECT key, language, value FROM translations ORDER BY key, language');
    const rows = result.rows as TranslationRow[];

    const translationsByKey: { [key: string]: { zh?: string; en?: string; ar?: string } } = {};

    for (const row of rows) {
      if (!translationsByKey[row.key]) {
        translationsByKey[row.key] = {};
      }
      translationsByKey[row.key][row.language as 'zh' | 'en' | 'ar'] = row.value;
    }

    const missingList: MissingItem[] = [];
    const languages = ['zh', 'en', 'ar'];
    const byLanguage = {
      zh: { total: 0, missing: 0 },
      en: { total: 0, missing: 0 },
      ar: { total: 0, missing: 0 }
    };

    const allKeys = Object.keys(translationsByKey);

    for (const key of allKeys) {
      const translations = translationsByKey[key];
      let isMissing = false;

      for (const lang of languages) {
        if (!translations[lang as 'zh' | 'en' | 'ar']) {
          isMissing = true;
          byLanguage[lang as keyof typeof byLanguage].missing++;
        }
        byLanguage[lang as keyof typeof byLanguage].total++;
      }

      if (isMissing) {
        missingList.push({
          key,
          zh: translations.zh ? '✅' : '❌',
          en: translations.en ? '✅' : '❌',
          ar: translations.ar ? '✅' : '❌'
        });
      }
    }

    const totalKeys = allKeys.length;
    const complete = totalKeys - missingList.length;
    const missing = missingList.length;

    logMonitor('TRANSLATIONS', 'SUCCESS', {
      action: 'GET_MISSING_TRANSLATIONS',
      userId,
      totalKeys,
      complete,
      missing
    });

    let responseData: any = {
      total_keys: totalKeys,
      complete,
      missing,
      by_language: byLanguage
    };

    if (filterLanguage === 'all') {
      responseData.missing_list = missingList;
    }

    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error getting missing translations:', error);
    logMonitor('TRANSLATIONS', 'ERROR', {
      action: 'GET_MISSING_TRANSLATIONS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to get missing translations' },
      { status: 500 }
    );
  }
}
