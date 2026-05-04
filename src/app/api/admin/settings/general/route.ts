import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('API', 'GET', '/api/admin/settings/general');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const result = await query('SELECT * FROM system_configs ORDER BY config_key');
    const configs: Record<string, string> = {};
    for (const row of result.rows) {
      configs[row.config_key] = row.config_value;
    }
    logApiSuccess('API', 'GET_GENERAL_CONFIG');
    return createSuccessResponse(configs);
  } catch (error) {
    logApiError('API', 'GET_GENERAL_CONFIG', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest) {
  logApiRequest('API', 'PUT', '/api/admin/settings/general');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue;
      await query(
        `INSERT INTO system_configs (config_key, config_value, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = datetime('now')`,
        [key, String(value)]
      );
    }

    logApiSuccess('API', 'UPDATE_GENERAL_CONFIG');
    return createSuccessResponse({ message: '配置已更新' });
  } catch (error) {
    logApiError('API', 'UPDATE_GENERAL_CONFIG', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
