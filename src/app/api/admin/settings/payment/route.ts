import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

const SUPPORTED_PAYMENT_METHODS = new Set(['paypal', 'stripe', 'alipay']);

function validatePaymentConfig(body: Record<string, unknown>) {
  if (typeof body.payment_method !== 'string' || !SUPPORTED_PAYMENT_METHODS.has(body.payment_method)) return 'INVALID_PAYMENT_METHOD';
  if (body.is_enabled !== undefined && typeof body.is_enabled !== 'boolean') return 'INVALID_IS_ENABLED';
  if (body.is_sandbox !== undefined && typeof body.is_sandbox !== 'boolean') return 'INVALID_IS_SANDBOX';
  if (body.display_name !== undefined && (typeof body.display_name !== 'string' || body.display_name.length > 80)) return 'INVALID_DISPLAY_NAME';
  if (body.sort_order !== undefined && (!Number.isInteger(Number(body.sort_order)) || Number(body.sort_order) < 0)) return 'INVALID_SORT_ORDER';
  if (body.config_json !== undefined && (typeof body.config_json !== 'object' || body.config_json === null || Array.isArray(body.config_json))) return 'INVALID_CONFIG_JSON';
  return null;
}

export async function GET(request: NextRequest) {
  logApiRequest('PAYMENTS', 'GET', '/api/admin/settings/payment');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const result = await query('SELECT * FROM payment_config ORDER BY sort_order');
    const SENSITIVE_KEYS = new Set(['client_secret', 'private_key', 'secret_key', 'app_secret', 'appSecretKey', 'secret']);
    const configs = result.rows.map((r: any) => {
      const parsed = r.config_json ? JSON.parse(String(r.config_json)) : {};
      const masked: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(parsed)) {
        masked[k] = SENSITIVE_KEYS.has(k) ? '***' : v;
      }
      return { ...r, config_json: masked };
    });

    logApiSuccess('PAYMENTS', 'GET_PAYMENT_CONFIG');
    return createSuccessResponse(configs);
  } catch (error) {
    logApiError('PAYMENTS', 'GET_PAYMENT_CONFIG', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: NextRequest) {
  logApiRequest('PAYMENTS', 'PUT', '/api/admin/settings/payment');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { payment_method, is_enabled, is_sandbox, config_json, display_name, sort_order } = body;

    if (!payment_method) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const validationError = validatePaymentConfig(body);
    if (validationError) {
      return createErrorResponse(validationError, 400);
    }

    const operatorName = auth.user.name || 'Admin';
    const existing = await query('SELECT * FROM payment_config WHERE payment_method = ?', [payment_method]);

    if (existing.rows.length > 0) {
      const updates: string[] = [];
      const paramsArr: any[] = [];
      if (is_enabled !== undefined) { updates.push('is_enabled = ?'); paramsArr.push(is_enabled ? 1 : 0); }
      if (is_sandbox !== undefined) { updates.push('is_sandbox = ?'); paramsArr.push(is_sandbox ? 1 : 0); }
      if (config_json !== undefined) { updates.push('config_json = ?'); paramsArr.push(JSON.stringify(config_json)); }
      if (display_name !== undefined) { updates.push('display_name = ?'); paramsArr.push(display_name); }
      if (sort_order !== undefined) { updates.push('sort_order = ?'); paramsArr.push(sort_order); }
      updates.push("updated_at = datetime('now')");

      paramsArr.push(payment_method);
      await query(`UPDATE payment_config SET ${updates.join(', ')} WHERE payment_method = ?`, paramsArr);
    } else {
      await query(
        `INSERT INTO payment_config (payment_method, display_name, is_enabled, is_sandbox, config_json, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [payment_method, display_name || payment_method, is_enabled ? 1 : 0, is_sandbox ? 1 : 0, JSON.stringify(config_json || {}), sort_order || 0]
      );
    }

    await recordAdminAuditLog({
      request,
      module: 'PAYMENTS',
      action: 'UPDATE_PAYMENT_CONFIG',
      description: `修改支付通道配置: ${payment_method}`,
      operator: operatorName,
      status: 'success',
      resourceId: payment_method,
      resourceType: 'payment_config',
      riskLevel: 'critical',
      metadata: body,
    });

    logApiSuccess('PAYMENTS', 'UPDATE_PAYMENT_CONFIG', { payment_method });
    return createSuccessResponse({ message: '支付配置已更新' });
  } catch (error) {
    logApiError('PAYMENTS', 'UPDATE_PAYMENT_CONFIG', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
