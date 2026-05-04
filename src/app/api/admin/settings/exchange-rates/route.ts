import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

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

    await query(
      `INSERT OR REPLACE INTO exchange_rates (currency, rate_to_usd, updated_at)
       VALUES (?, ?, datetime('now'))`,
      [currency.toUpperCase(), rate_to_usd]
    );

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

    await query('DELETE FROM exchange_rates WHERE currency = ?', [currency.toUpperCase()]);
    logApiSuccess('PAYMENTS', 'DELETE_EXCHANGE_RATE', { currency });
    return createSuccessResponse({ message: '汇率已删除' });
  } catch (error) {
    logApiError('PAYMENTS', 'DELETE_EXCHANGE_RATE', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
