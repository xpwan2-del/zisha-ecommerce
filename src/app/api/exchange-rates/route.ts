import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { setRatesCache } from '@/lib/utils/currency';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {GET} /api/exchange-rates 获取汇率
 * @apiName GetExchangeRates
 * @apiGroup EXCHANGE_RATES
 * @apiDescription 获取各货币之间的实时汇率。
 */


export async function GET() {
  try {
    logMonitor('EXCHANGE_RATES', 'REQUEST', { method: 'GET', action: 'GET_EXCHANGE_RATES' });

    const result = await query('SELECT currency, rate_to_usd FROM exchange_rates');
    const rates: Record<string, number> = { USD: 1 };

    for (const row of result.rows as any[]) {
      rates[row.currency] = row.rate_to_usd;
    }

    setRatesCache({
      USD: rates['USD'] || 1,
      CNY: rates['CNY'] || 7.19,
      AED: rates['AED'] || 3.674
    });

    logMonitor('EXCHANGE_RATES', 'SUCCESS', { action: 'GET_EXCHANGE_RATES', currencies: Object.keys(rates) });
    return NextResponse.json({ success: true, rates });
  } catch (error: any) {
    logMonitor('EXCHANGE_RATES', 'ERROR', { action: 'GET_EXCHANGE_RATES', error: error?.message || String(error) });
    console.error('[ExchangeRates] Failed to fetch rates:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch rates' }, { status: 500 });
  }
}
