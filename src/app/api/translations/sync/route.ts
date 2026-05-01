import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 翻译数据同步 - 将JSON文件翻译同步到数据库
 * ============================================================
 *
 * @api {POST} /api/translations/sync 同步翻译数据
 * @apiName SyncTranslations
 * @apiGroup TRANSLATIONS
 * @apiDescription 将本地JSON翻译文件同步到数据库，支持全量同步和增量同步
 *
 * @apiHeader {String} Authorization Bearer Token 管理员认证凭证
 *
 * @apiBody {String} mode 同步模式 (full=全量覆盖, incremental=增量更新)
 * @apiBody {Object[]} [translations] 手动传入的翻译数据（可选）
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "total": 250,
 *         "added": 50,
 *         "updated": 200,
 *         "errors": 0
 *       }
 *     }
 *
 * @apiError {String} UNAUTHORIZED 未登录或非管理员
 * @apiError {String} FORBIDDEN 无权限
 */

interface TranslationData {
  [key: string]: string | TranslationData;
}

interface SyncResult {
  total: number;
  added: number;
  updated: number;
  errors: number;
  errorsList?: string[];
}

function flattenObject(obj: TranslationData, prefix: string = ''): { key: string; value: string }[] {
  const result: { key: string; value: string }[] = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === 'string') {
      result.push({ key: fullKey, value });
    } else if (typeof value === 'object' && value !== null) {
      result.push(...flattenObject(value, fullKey));
    }
  }

  return result;
}

function loadTranslationsFromFile(lang: string): { key: string; value: string }[] {
  try {
    const translations = require(`@/i18n/locales/${lang}.json`);
    return flattenObject(translations);
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    return [];
  }
}

async function syncTranslations(
  mode: 'full' | 'incremental',
  manualTranslations?: { key: string; zh: string; en: string; ar: string }[]
): Promise<SyncResult> {
  const result: SyncResult = {
    total: 0,
    added: 0,
    updated: 0,
    errors: 0,
    errorsList: []
  };

  const languages = ['zh', 'en', 'ar'];
  const now = new Date().toISOString();

  for (const lang of languages) {
    const translations = loadTranslationsFromFile(lang);

    for (const { key, value } of translations) {
      try {
        if (mode === 'full') {
          const updateResult = await query(`
            INSERT INTO translations (key, language, value, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(key, language) DO UPDATE SET
              value = excluded.value,
              updated_at = excluded.updated_at
          `, [key, lang, value, now, now]);

          if (updateResult.changes && updateResult.changes > 0) {
            result.updated++;
          } else {
            result.added++;
          }
        } else {
          const existing = await query(`
            SELECT id FROM translations WHERE key = ? AND language = ?
          `, [key, lang]);

          if (existing.rows.length === 0) {
            await query(`
              INSERT INTO translations (key, language, value, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?)
            `, [key, lang, value, now, now]);
            result.added++;
          }
        }
        result.total++;
      } catch (error) {
        result.errors++;
        result.errorsList?.push(`Error syncing ${key} (${lang}): ${error}`);
      }
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  logMonitor('TRANSLATIONS', 'REQUEST', {
    method: 'POST',
    path: '/api/translations/sync'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('TRANSLATIONS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const userId = authResult.user?.userId;

    logMonitor('TRANSLATIONS', 'INFO', {
      action: 'SYNC_TRANSLATIONS',
      userId,
      user: authResult.user?.email
    });

    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'full';
    const translations = body.translations;

    if (!['full', 'incremental'].includes(mode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mode. Must be "full" or "incremental"' },
        { status: 400 }
      );
    }

    const result = await syncTranslations(mode, translations);

    logMonitor('TRANSLATIONS', 'SUCCESS', {
      action: 'SYNC_TRANSLATIONS',
      userId,
      result
    });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error syncing translations:', error);
    logMonitor('TRANSLATIONS', 'ERROR', {
      action: 'SYNC_TRANSLATIONS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to sync translations' },
      { status: 500 }
    );
  }
}
