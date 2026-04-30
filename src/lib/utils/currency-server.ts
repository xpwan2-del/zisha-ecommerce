import { query } from '@/lib/db';

let ratesCache: { CNY: number; AED: number; USD: number } | null = null;

export async function getExchangeRates(): Promise<{ CNY: number; AED: number; USD: number }> {
  if (ratesCache) {
    return ratesCache;
  }

  try {
    const result = await query('SELECT currency, rate_to_usd FROM exchange_rates');
    const rates: Record<string, number> = { USD: 1 };

    for (const row of result.rows as any[]) {
      rates[row.currency] = row.rate_to_usd;
    }

    ratesCache = {
      USD: rates['USD'] || 1,
      CNY: rates['CNY'] || 7.19,
      AED: rates['AED'] || 3.674
    };

    return ratesCache;
  } catch (error) {
    console.error('[Currency] Failed to get exchange rates:', error);
    return { USD: 1, CNY: 7.19, AED: 3.674 };
  }
}

export function clearRatesCache(): void {
  ratesCache = null;
}

export function setRatesCache(rates: { CNY: number; AED: number; USD: number }): void {
  ratesCache = rates;
}
