import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {GET} /api/translations/fetch 获取前端翻译
 * @apiName FetchTranslations
 * @apiGroup TRANSLATIONS
 * @apiDescription 为前端提供指定语言的翻译词条，用于 i18n。
 */


export async function GET(request: NextRequest) {
  try {
    logMonitor('TRANSLATIONS', 'REQUEST', { method: 'GET', action: 'FETCH_TRANSLATIONS' });
    
    const url = new URL(request.url);
    const language = url.searchParams.get('language') || 'en';

    const result = await query(
      'SELECT key, value FROM translations WHERE language = $1',
      [language]
    );

    const translations: Record<string, string> = {};
    result.rows.forEach((row: any) => {
      translations[row.key] = row.value;
    });

    logMonitor('TRANSLATIONS', 'SUCCESS', { action: 'FETCH_TRANSLATIONS', language, count: Object.keys(translations).length, source: 'database' });
    
    return NextResponse.json(translations);
  } catch (error: any) {
    logMonitor('TRANSLATIONS', 'ERROR', { action: 'FETCH_TRANSLATIONS', error: error?.message || String(error) });
    console.error('Error fetching translations:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch translations' }, { status: 500 });
  }
}
