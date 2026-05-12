import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

const SUPPORTED_CURRENCIES = new Set(['USD', 'CNY', 'EUR', 'GBP', 'JPY', 'HKD', 'AED', 'SAR']);

function validateExchangeRate(currency: unknown, rateToUsd: unknown) {
  if (typeof currency !== 'string' || !SUPPORTED_CURRENCIES.has(currency.toUpperCase())) return 'INVALID_CURRENCY';
  const rate = Number(rateToUsd);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1000000) return 'INVALID_RATE';
  return null;
}

export async function GET(request: NextRequest) {
  logApiRequest('PAYMENTS', 'GET', '/api/admin/settings/exchange-rates');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const result = await query('SELECT * FROM exchange_rates ORDER BY currency');
    logApiSuccess('PAYMENTS', 'GET_EXCHANGE_RATES');
    return createSuccessResponse(result.rows);
  } catch (error) {
    logApiError('PAYMENTS', 'GET_EXCHANGE_RATES', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  logApiRequest('PAYMENTS', 'POST', '/api/admin/settings/exchange-rates');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { currency, rate_to_usd } = body;

    if (!currency || rate_to_usd === undefined) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const validationError = validateExchangeRate(currency, rate_to_usd);
    if (validationError) {
      return createErrorResponse(validationError, 400);
    }

    const normalizedCurrency = currency.toUpperCase();
    const beforeResult = await query('SELECT * FROM exchange_rates WHERE currency = ?', [normalizedCurrency]);

    await query(
      `INSERT OR REPLACE INTO exchange_rates (currency, rate_to_usd, updated_at)
       VALUES (?, ?, datetime('now'))`,
      [normalizedCurrency, rate_to_usd]
    );

    await recordAdminAuditLog({
      request,
      module: 'PAYMENTS',
      action: 'UPSERT_EXCHANGE_RATE',
      description: `管理员新增或更新汇率: ${normalizedCurrency}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: normalizedCurrency,
      resourceType: 'exchange_rate',
      riskLevel: 'high',
      metadata: {
        currency: normalizedCurrency,
        before: beforeResult.rows?.[0] || null,
        after: { currency: normalizedCurrency, rate_to_usd: Number(rate_to_usd) }
      }
    });

    logApiSuccess('PAYMENTS', 'ADD_EXCHANGE_RATE', { currency });
    return createSuccessResponse({ message: '汇率已添加' }, 201);
  } catch (error) {
    logApiError('PAYMENTS', 'ADD_EXCHANGE_RATE', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest) {
  logApiRequest('PAYMENTS', 'DELETE', '/api/admin/settings/exchange-rates');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency');
    if (!currency) return createErrorResponse('MISSING_PARAMS', 400);

    const normalizedCurrency = currency.toUpperCase();
    const validationError = validateExchangeRate(normalizedCurrency, 1);
    if (validationError) return createErrorResponse(validationError, 400);

    const beforeResult = await query('SELECT * FROM exchange_rates WHERE currency = ?', [normalizedCurrency]);
    if (!beforeResult.rows?.length) return createErrorResponse('NOT_FOUND', 404);

    const result = await query('DELETE FROM exchange_rates WHERE currency = ?', [normalizedCurrency]);
    if (!result.changes) return createErrorResponse('NOT_FOUND', 404);

    await recordAdminAuditLog({
      request,
      module: 'PAYMENTS',
      action: 'DELETE_EXCHANGE_RATE',
      description: `管理员删除汇率: ${normalizedCurrency}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: normalizedCurrency,
      resourceType: 'exchange_rate',
      riskLevel: 'high',
      metadata: { currency: normalizedCurrency, deleted: beforeResult.rows[0] }
    });

    logApiSuccess('PAYMENTS', 'DELETE_EXCHANGE_RATE', { currency });
    return createSuccessResponse({ message: '汇率已删除' });
  } catch (error) {
    logApiError('PAYMENTS', 'DELETE_EXCHANGE_RATE', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
