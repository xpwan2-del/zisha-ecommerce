const exchangeRates = {
  aed: 1,
  usd: 0.2722,
  cny: 1.9558,
  eur: 0.2510
};

const toSafeNumber = (value: any): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

export const convertCurrency = (amount: any, fromCurrency: string, toCurrency: string): number => {
  const numAmount = toSafeNumber(amount);
  if (numAmount === 0) return 0;
  
  if (fromCurrency === toCurrency) return numAmount;
  
  const fromRate = exchangeRates[fromCurrency as keyof typeof exchangeRates];
  const toRate = exchangeRates[toCurrency as keyof typeof exchangeRates];
  
  if (!fromRate || !toRate) return numAmount;
  
  const amountInAED = numAmount / fromRate;
  return amountInAED * toRate;
};

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

export const supportedCurrencies = [
  { code: 'aed', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'usd', name: 'US Dollar', symbol: '$' },
  { code: 'cny', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'eur', name: 'Euro', symbol: '€' }
];
