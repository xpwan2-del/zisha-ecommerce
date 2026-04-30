"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/lib/contexts/CartContext';
import { useAuth } from '@/lib/contexts/AuthContext';

export function Navbar() {
  const { t, i18n: i18nInstance } = useTranslation();
  const { totalItems } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const changeLanguage = (lang: string) => {
    i18nInstance.changeLanguage(lang);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
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
            <a href="/reviews" className="text-xs text-text-muted hover:text-accent transition-colors duration-300 tracking-wide">
              {t('nav.reviews')}
            </a>
            <a href="/about" className="text-xs text-text-muted hover:text-accent transition-colors duration-300 tracking-wide">
              {t('nav.about')}
            </a>
            <a href="/contact" className="text-xs text-text-muted hover:text-accent transition-colors duration-300 tracking-wide">
              {t('nav.contact')}
            </a>
          </div>
        </div>
      </div>

      {/* Main navigation - Luxury Style */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20">
          {/* Logo - Luxury Style */}
          <a href="/" className="flex-shrink-0 flex items-center">
            <img 
              src="/logo.png" 
              alt="丝路砂" 
              className="h-12 w-auto max-w-[120px] object-contain"
            />
          </a>
          
          {/* Navigation links - Luxury Style */}
          <div className="flex items-center space-x-10">
            <a href="/deals" className="text-sm font-medium text-accent border-b-2 border-accent pb-5 tracking-wide transition-all duration-300">
              {t('nav.deals')}
            </a>
            <a href="/products" className="text-sm font-medium text-dark hover:text-accent pb-5 tracking-wide transition-colors duration-300">
              {t('nav.products')}
            </a>
            <a href="/customize" className="text-sm font-medium text-dark hover:text-accent pb-5 tracking-wide transition-colors duration-300">
              {t('nav.customize')}
            </a>
            <a href="/flash-sale" className="text-sm font-medium text-dark hover:text-accent pb-5 tracking-wide transition-colors duration-300">
              {t('nav.flash_sale')}
            </a>
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
              <button 
                onClick={() => changeLanguage('zh')}
                className="text-sm text-dark hover:text-accent transition-colors duration-300 tracking-wide"
              >
                {t('common.zh')}
              </button>
              <button 
                onClick={() => changeLanguage('en')}
                className="text-sm text-dark hover:text-accent transition-colors duration-300 tracking-wide"
              >
                {t('common.en')}
              </button>
              <button 
                onClick={() => changeLanguage('ar')}
                className="text-sm text-dark hover:text-accent transition-colors duration-300 tracking-wide"
              >
                {t('common.ar')}
              </button>
              <a href="/cart" className="relative group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-dark group-hover:text-accent transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {totalItems}
                  </span>
                )}
              </a>
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
                        <a href="/account" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          {t('nav.account')}
                        </a>
                        <a href="/account?tab=orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          {t('nav.orders')}
                        </a>
                        <a href="/account?tab=settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          {t('account.profile')}
                        </a>
                        <button 
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {t('nav.logout')}
                        </button>
                      </>
                    ) : (
                      <>
                        <a href="/login" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          {t('nav.login')}
                        </a>
                        <a href="/register" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          {t('nav.register')}
                        </a>
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
