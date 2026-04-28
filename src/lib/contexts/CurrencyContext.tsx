"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supportedCurrencies } from '@/lib/utils/currency';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  supportedCurrencies: Array<{ code: string; name: string; symbol: string }>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<string>('aed');

  // Load currency from localStorage on mount
  useEffect(() => {
    const storedCurrency = localStorage.getItem('currency');
    if (storedCurrency && supportedCurrencies.some(c => c.code === storedCurrency)) {
      setCurrency(storedCurrency);
    }
  }, []);

  // Save currency to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        supportedCurrencies
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}