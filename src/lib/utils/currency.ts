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

export const formatCurrency = (amount: any, currency: string): string => {
  const numAmount = toSafeNumber(amount);
  if (numAmount === 0) return '0.00';
  
  const safeCurrency = currency || 'aed';
  const currencySymbols: Record<string, string> = {
    aed: 'AED',
    usd: '$',
    cny: '¥',
    eur: '€'
  };
  
  const symbol = currencySymbols[safeCurrency] || safeCurrency.toUpperCase();
  
  try {
    const formattedAmount = numAmount.toFixed(2);
    if (safeCurrency === 'aed' || safeCurrency === 'eur') {
      return `${formattedAmount} ${symbol}`;
    }
    return `${symbol}${formattedAmount}`;
  } catch (e) {
    return '0.00';
  }
};

export const supportedCurrencies = [
  { code: 'aed', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'usd', name: 'US Dollar', symbol: '$' },
  { code: 'cny', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'eur', name: 'Euro', symbol: '€' }
];