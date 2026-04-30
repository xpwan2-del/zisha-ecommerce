import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { setRatesCache } from '@/lib/utils/currency';

export async function GET() {
  try {
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

    return NextResponse.json({ success: true, rates });
  } catch (error) {
    console.error('[ExchangeRates] Failed to fetch rates:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch rates' }, { status: 500 });
  }
}
