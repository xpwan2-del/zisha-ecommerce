"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from './ThemeProvider';
import { useCart } from '@/lib/contexts/CartContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';

export function Navbar() {
  const { t, i18n: i18nInstance } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { totalItems } = useCart();
  const { user, logout, isAuthenticated } = useAuth();
  const { currency, setCurrency, supportedCurrencies } = useCurrency();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const changeLanguage = (lang: string) => {
    i18nInstance.changeLanguage(lang);
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh', name: '中文' },
    { code: 'ar', name: 'العربية' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
      {/* Top navigation bar */}
      <div className="bg-gray-100 dark:bg-gray-700 py-1 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`px-2 py-1 text-xs rounded ${i18nInstance.language === lang.code ? 'bg-amazon-blue text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                {lang.code.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setIsCurrencyMenuOpen(!isCurrencyMenuOpen)}
                className="flex items-center space-x-1 px-2 py-1 text-xs rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <span>{currency.toUpperCase()}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isCurrencyMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
                  {supportedCurrencies.map((curr) => (
                    <button
                      key={curr.code}
                      onClick={() => {
                        setCurrency(curr.code);
                        setIsCurrencyMenuOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm ${currency === curr.code ? 'bg-amazon-blue text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      {curr.name} ({curr.symbol})
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isAuthenticated ? (
              <div className="relative">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-1 px-2 py-1 text-xs rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <span className="hidden sm:inline">{user?.name || 'Account'}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
                    <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      Profile
                    </a>
                    <a href="/orders" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      Orders
                    </a>
                    <button 
                      onClick={logout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <a href="/login" className="text-xs text-gray-600 dark:text-gray-300 hover:text-amazon-blue">
                  Sign in
                </a>
                <span className="text-gray-400">|</span>
                <a href="/register" className="text-xs text-gray-600 dark:text-gray-300 hover:text-amazon-blue">
                  Create account
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          <a href="/" className="flex-shrink-0 flex items-center">
            <span className="text-2xl font-bold text-amazon-blue">Zisha Pottery</span>
          </a>
          
          {/* Search bar */}
          <div className="flex-1 mx-6">
            <form onSubmit={handleSearch} className="relative">
              <div className="flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('navbar.search_placeholder') || 'Search Zisha Pottery...'}
                  className="w-full h-10 px-4 py-2 border border-amazon-border rounded-l-md focus:outline-none focus:ring-2 focus:ring-amazon-blue focus:border-transparent"
                />
                <button 
                  type="submit"
                  className="bg-amazon-orange hover:bg-amazon-light-orange text-amazon-dark font-medium h-10 px-4 rounded-r-md transition-colors duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
          
          {/* Cart */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <a href="/cart" className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-amazon-orange text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </a>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="bg-gray-100 dark:bg-gray-700 border-t border-amazon-border">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2 overflow-x-auto">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded flex-shrink-0 sm:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>All</span>
            </button>
            <div className="hidden sm:flex items-center gap-4 lg:gap-6 flex-nowrap overflow-x-auto">
              <a href="/products" className="text-sm text-gray-800 dark:text-gray-100 hover:text-amazon-orange whitespace-nowrap px-2 py-1">
                All
              </a>
              <a href="/products?category=1" className="text-sm text-gray-800 dark:text-gray-100 hover:text-amazon-orange whitespace-nowrap px-2 py-1">
                {t('categories.items.0') || 'Teapots'}
              </a>
              <a href="/products?category=2" className="text-sm text-gray-800 dark:text-gray-100 hover:text-amazon-orange whitespace-nowrap px-2 py-1">
                {t('categories.items.1') || 'Cups'}
              </a>
              <a href="/products?category=3" className="text-sm text-gray-800 dark:text-gray-100 hover:text-amazon-orange whitespace-nowrap px-2 py-1">
                {t('categories.items.2') || 'Accessories'}
              </a>
              <a href="/products?category=4" className="text-sm text-gray-800 dark:text-gray-100 hover:text-amazon-orange whitespace-nowrap px-2 py-1">
                {t('categories.items.3') || 'Sets'}
              </a>
              <a href="/customize" className="text-sm text-gray-800 dark:text-gray-100 hover:text-amazon-orange whitespace-nowrap px-2 py-1">
                Customize
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden bg-white dark:bg-gray-800 shadow-lg">
          <div className="pt-2 pb-3 space-y-1">
            <a href="/products" className="block px-4 py-2 text-base font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
              All Products
            </a>
            <a href="/products?category=teapots" className="block px-4 py-2 text-base font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
              {t('categories.items.0') || 'Teapots'}
            </a>
            <a href="/products?category=cups" className="block px-4 py-2 text-base font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
              {t('categories.items.1') || 'Cups'}
            </a>
            <a href="/products?category=accessories" className="block px-4 py-2 text-base font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
              {t('categories.items.2') || 'Accessories'}
            </a>
            <a href="/products?category=sets" className="block px-4 py-2 text-base font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
              {t('categories.items.3') || 'Sets'}
            </a>
            <a href="/customize" className="block px-4 py-2 text-base font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
              Customize
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}