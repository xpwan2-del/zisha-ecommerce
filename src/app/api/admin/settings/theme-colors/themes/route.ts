import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';

export async function GET(request: NextRequest) {
  logApiRequest('SETTINGS', 'GET', '/api/admin/settings/theme-colors/themes');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const result = await query("SELECT DISTINCT theme_key FROM theme_color_configs");

    const themeNames: Record<string, string> = {
      chinese: '中国风',
      middleEastern: '中东风格',
      amazon: '亚马逊风格',
      middleEasternLuxury: '中东奢华风格',
    };

    const themes: Record<string, { name: string }> = {};
    result.rows.forEach((row: any) => {
      themes[row.theme_key] = { name: themeNames[row.theme_key] || row.theme_key };
    });

    logApiSuccess('SETTINGS', 'GET');
    return NextResponse.json({ success: true, data: themes });
  } catch (error: any) {
    logApiError('SETTINGS', 'GET', error);
    return createErrorResponse('THEMES_LOAD_FAILED', 500);
  }
}
