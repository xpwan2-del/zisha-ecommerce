const toSafeNumber = (value: any): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

const DEFAULT_RATES = {
  USD: 1,
  CNY: 7.19,
  AED: 3.674
};

let ratesCache: { CNY: number; AED: number; USD: number } | null = null;

export function setRatesCache(rates: { CNY: number; AED: number; USD: number }): void {
  ratesCache = rates;
}

export function clearRatesCache(): void {
  ratesCache = null;
}

export function convertFromUSD(amountUSD: number): { usd: number; cny: number; aed: number } {
  const rates = ratesCache || DEFAULT_RATES;
  return {
    usd: toSafeNumber(amountUSD),
    cny: toSafeNumber(amountUSD) * rates.CNY,
    aed: toSafeNumber(amountUSD) * rates.AED
  };
}

const DEFAULT_CURRENCY_CONFIG: Record<string, { prefix: string; suffix: string; position: string }> = {
  USD: { prefix: '$', suffix: '', position: 'before' },
  CNY: { prefix: '¥', suffix: '', position: 'before' },
  AED: { prefix: '', suffix: 'AED', position: 'after' }
};

export const formatCurrency = (
  amount: any,
  currency: string,
  themeCurrencyConfig?: Record<string, string>
): string => {
  const numAmount = toSafeNumber(amount);
  if (numAmount === 0) return '0.00';

  const safeCurrency = (currency || 'USD').toUpperCase();

  let prefix = DEFAULT_CURRENCY_CONFIG[safeCurrency]?.prefix || '';
  let suffix = DEFAULT_CURRENCY_CONFIG[safeCurrency]?.suffix || '';
  let position = DEFAULT_CURRENCY_CONFIG[safeCurrency]?.position || 'before';

  if (themeCurrencyConfig) {
    const keyPrefix = `currency_${safeCurrency.toLowerCase()}_prefix`;
    const keySuffix = `currency_${safeCurrency.toLowerCase()}_suffix`;
    const keyPosition = `currency_${safeCurrency.toLowerCase()}_position`;

    if (themeCurrencyConfig[keyPrefix] !== undefined) prefix = themeCurrencyConfig[keyPrefix];
    if (themeCurrencyConfig[keySuffix] !== undefined) suffix = themeCurrencyConfig[keySuffix];
    if (themeCurrencyConfig[keyPosition] !== undefined) position = themeCurrencyConfig[keyPosition];
  }

  const formattedAmount = numAmount.toFixed(2);

  if (position === 'after') {
    return `${prefix}${formattedAmount}${suffix}`;
  }
  return `${prefix}${formattedAmount}${suffix}`;
};

export function formatMultiPriceSync(amountUSD: number): string {
  const rates = ratesCache || DEFAULT_RATES;
  const usd = toSafeNumber(amountUSD);
  const cny = usd * rates.CNY;
  const aed = usd * rates.AED;

  return `$${usd.toFixed(2)} / ¥${cny.toFixed(2)} / AED${aed.toFixed(2)}`;
}

export const formatMultiCurrency = (
  amountUSD: number,
  amountCNY: number,
  amountAED: number,
  themeCurrencyConfig?: Record<string, string>
): { usd: string; cny: string; aed: string } => {
  return {
    usd: formatCurrency(amountUSD, 'USD', themeCurrencyConfig),
    cny: formatCurrency(amountCNY, 'CNY', themeCurrencyConfig),
    aed: formatCurrency(amountAED, 'AED', themeCurrencyConfig)
  };
};

export const convertCurrency = (amount: any, fromCurrency: string, toCurrency: string): number => {
  const numAmount = toSafeNumber(amount);
  if (numAmount === 0) return 0;

  if (fromCurrency === toCurrency) return numAmount;

  const rates = ratesCache || DEFAULT_RATES;
  const fromRate = rates[fromCurrency as keyof typeof rates];
  const toRate = rates[toCurrency as keyof typeof rates];

  if (!fromRate || !toRate) return numAmount;

  const amountInUSD = numAmount / fromRate;
  return amountInUSD * toRate;
};

export const supportedCurrencies = [
  { code: 'aed', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'usd', name: 'US Dollar', symbol: '$' },
  { code: 'cny', name: 'Chinese Yuan', symbol: '¥' }
];

export const COUNTDOWN_MINUTES = 30;

export function getCountdown(createdAt: string, lang: string = 'zh'): { remaining: number; display: string; urgency: 'normal' | 'warning' | 'critical' | 'expired' } {
  const now = Date.now();
  const created = new Date(createdAt + 'Z').getTime();
  const deadline = created + COUNTDOWN_MINUTES * 60 * 1000;
  const remaining = Math.max(0, Math.floor((deadline - now) / 1000));

  if (remaining <= 0) return { remaining: 0, display: '00:00', urgency: 'expired' };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  const display = lang === 'ar' ? `تنتهي خلال ${timeStr}` : lang === 'en' ? `Expires in ${timeStr}` : `剩余时间 ${timeStr}`;

  let urgency: 'normal' | 'warning' | 'critical' = 'normal';
  if (remaining <= 300) urgency = 'critical';
  else if (remaining <= 600) urgency = 'warning';

  return { remaining, display, urgency };
}
