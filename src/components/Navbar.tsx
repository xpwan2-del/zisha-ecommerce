"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/lib/contexts/CartContext';
import { useAuth } from '@/lib/contexts/AuthContext';

const LANGUAGE_OPTIONS = [
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export function Navbar() {
  const router = useRouter();
  const { t, i18n: i18nInstance } = useTranslation();
  const { totalItems } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const currentLanguage = LANGUAGE_OPTIONS.find((option) => option.code === i18nInstance.language) || LANGUAGE_OPTIONS[1];

  const changeLanguage = (lang: string) => {
    i18nInstance.changeLanguage(lang);
    setShowLanguageMenu(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      {/* Top navigation bar - Luxury Style */}
      <div className="bg-dark py-2 px-4">
        <div className="max-w-7xl mx-auto flex justify-end items-center">
          <div className="flex items-center space-x-8">
            <Link href="/reviews" className="text-xs text-text-muted hover:text-accent transition-colors duration-300 tracking-wide">
              {t('nav.reviews')}
            </Link>
            <Link href="/about" className="text-xs text-text-muted hover:text-accent transition-colors duration-300 tracking-wide">
              {t('nav.about')}
            </Link>
            <Link href="/contact" className="text-xs text-text-muted hover:text-accent transition-colors duration-300 tracking-wide">
              {t('nav.contact')}
            </Link>
          </div>
        </div>
      </div>

      {/* Main navigation - Luxury Style */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20">
          {/* Logo - Luxury Style */}
          <Link href="/" className="flex-shrink-0 flex items-center">
            <img 
              src="/logo.png" 
              alt="丝路砂" 
              className="h-12 w-auto max-w-[120px] object-contain"
            />
          </Link>
          
          {/* Navigation links - Luxury Style */}
          <div className="flex items-center space-x-10">
            <Link href="/deals" className="text-sm font-medium text-accent border-b-2 border-accent pb-5 tracking-wide transition-all duration-300">
              {t('nav.deals')}
            </Link>
            <Link href="/products" className="text-sm font-medium text-dark hover:text-accent pb-5 tracking-wide transition-colors duration-300">
              {t('nav.products')}
            </Link>
            <Link href="/customize" className="text-sm font-medium text-dark hover:text-accent pb-5 tracking-wide transition-colors duration-300">
              {t('nav.customize')}
            </Link>
            <Link href="/flash-sale" className="text-sm font-medium text-dark hover:text-accent pb-5 tracking-wide transition-colors duration-300">
              {t('nav.flash_sale')}
            </Link>
          </div>
          
          {/* Search bar and user controls - Luxury Style */}
          <div className="flex-1 flex justify-end items-center space-x-6">
            <div className="flex items-center">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-border border-r-0 rounded-l-sm px-4 py-2.5 text-sm bg-card text-dark focus:outline-none focus:border-accent transition-colors duration-300"
              >
                <option value="all">{t('categories.all')}</option>
                <option value="teapots">{t('categories.items.0')}</option>
                <option value="cups">{t('categories.items.1')}</option>
                <option value="accessories">{t('categories.items.2')}</option>
                <option value="sets">{t('categories.items.3')}</option>
              </select>
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('products.search_placeholder')}
                  className="border border-border px-4 py-2.5 text-sm w-64 text-dark placeholder-text-muted focus:outline-none focus:border-accent transition-colors duration-300"
                />
                <button 
                  type="submit"
                  className="bg-accent hover:bg-accent text-white px-5 py-2.5 transition-all duration-300 rounded-r-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-sm text-dark hover:border-accent hover:text-accent transition-colors duration-300"
                >
                  <span className="text-base leading-none">{currentLanguage.flag}</span>
                  <span>{currentLanguage.label}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showLanguageMenu && (
                  <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-md border border-border bg-card shadow-lg z-50">
                    {LANGUAGE_OPTIONS.map((option) => (
                      <button
                        key={option.code}
                        type="button"
                        onClick={() => changeLanguage(option.code)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors duration-300 ${currentLanguage.code === option.code ? 'bg-background text-accent' : 'text-dark hover:bg-background hover:text-accent'}`}
                      >
                        <span className="text-base leading-none">{option.flag}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/cart" className="relative group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-dark group-hover:text-accent transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {totalItems}
                  </span>
                )}
              </Link>
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="group"
                >
                  {isAuthenticated && user ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-dark group-hover:text-accent transition-colors duration-300">
                        {user.name}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-dark group-hover:text-accent transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-dark group-hover:text-accent transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    {isAuthenticated ? (
                      <>
                        <Link href="/account" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          {t('nav.account')}
                        </Link>
                        <Link href="/account?tab=orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          {t('nav.orders')}
                        </Link>
                        <Link href="/account?tab=settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          {t('account.profile')}
                        </Link>
                        <button 
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {t('nav.logout')}
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href="/login" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          {t('nav.login')}
                        </Link>
                        <Link href="/register" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          {t('nav.register')}
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
