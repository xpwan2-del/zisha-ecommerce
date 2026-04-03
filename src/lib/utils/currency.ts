const exchangeRates = {
  aed: 1,
  usd: 0.2722,
  cny: 1.9558,
  eur: 0.2510
};

export const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
  if (fromCurrency === toCurrency) return amount;
  
  // Convert to AED first
  const amountInAED = amount / exchangeRates[fromCurrency as keyof typeof exchangeRates];
  // Convert to target currency
  return amountInAED * exchangeRates[toCurrency as keyof typeof exchangeRates];
};

export const formatCurrency = (amount: number, currency: string): string => {
  const currencySymbols: Record<string, string> = {
    aed: 'AED',
    usd: '$',
    cny: '¥',
    eur: '€'
  };
  
  const symbol = currencySymbols[currency] || currency;
  const formattedAmount = amount.toFixed(2);
  
  if (currency === 'aed' || currency === 'eur') {
    return `${formattedAmount} ${symbol}`;
  } else {
    return `${symbol}${formattedAmount}`;
  }
};

export const supportedCurrencies = [
  { code: 'aed', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'usd', name: 'US Dollar', symbol: '$' },
  { code: 'cny', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'eur', name: 'Euro', symbol: '€' }
];