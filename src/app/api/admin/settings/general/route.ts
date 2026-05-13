import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

const ALLOWED_GENERAL_CONFIG_KEYS = new Set([
  'site_name',
  'site_description',
  'contact_email',
  'support_phone',
  'default_language',
  'default_currency',
  'active_theme',
  'maintenance_mode',
]);

function validateGeneralConfig(body: Record<string, unknown>) {
  const entries = Object.entries(body).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return 'EMPTY_CONFIG';
  for (const [key, value] of entries) {
    if (!ALLOWED_GENERAL_CONFIG_KEYS.has(key)) return 'INVALID_CONFIG_KEY';
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return 'INVALID_CONFIG_VALUE';
    if (String(value).length > 500) return 'CONFIG_VALUE_TOO_LONG';
  }
  return null;
}

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
    const validationError = validateGeneralConfig(body);
    if (validationError) {
      return createErrorResponse(validationError, 400);
    }

    const beforeResult = await query(
      `SELECT config_key, config_value FROM system_configs
       WHERE config_key IN (${Object.keys(body).map(() => '?').join(',')})`,
      Object.keys(body)
    );
    const beforeConfigs = Object.fromEntries((beforeResult.rows || []).map((row: any) => [row.config_key, row.config_value]));

    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue;
      await query(
        `INSERT INTO system_configs (config_key, config_value, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = datetime('now')`,
        [key, String(value)]
      );
    }

    await recordAdminAuditLog({
      request,
      module: 'SETTINGS',
      action: 'UPDATE_GENERAL_CONFIG',
      description: '管理员更新系统通用设置',
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceType: 'system_config',
      riskLevel: 'high',
      metadata: {
        keys: Object.keys(body),
        before: beforeConfigs,
        after: Object.fromEntries(Object.entries(body).map(([key, value]) => [key, String(value)]))
      }
    });

    logApiSuccess('API', 'UPDATE_GENERAL_CONFIG');
    return createSuccessResponse({ message: '配置已更新' });
  } catch (error) {
    logApiError('API', 'UPDATE_GENERAL_CONFIG', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
