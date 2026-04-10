"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/lib/contexts/CartContext';
import { useAuth } from '@/lib/contexts/AuthContext';

export function Navbar() {
  const { t, i18n: i18nInstance } = useTranslation();
  const { totalItems } = useCart();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');

  const changeLanguage = (lang: string) => {
    i18nInstance.changeLanguage(lang);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAF9] border-b border-[#E7E5E4]">
      {/* Top navigation bar - Luxury Style */}
      <div className="bg-[#1C1917] py-2 px-4">
        <div className="max-w-7xl mx-auto flex justify-end items-center">
          <div className="flex items-center space-x-8">
            <a href="/reviews" className="text-xs text-[#A8A29E] hover:text-[#CA8A04] transition-colors duration-300 tracking-wide">
              用户评价
            </a>
            <a href="/about" className="text-xs text-[#A8A29E] hover:text-[#CA8A04] transition-colors duration-300 tracking-wide">
              关于我们
            </a>
            <a href="/contact" className="text-xs text-[#A8A29E] hover:text-[#CA8A04] transition-colors duration-300 tracking-wide">
              联系我们
            </a>
          </div>
        </div>
      </div>

      {/* Main navigation - Luxury Style */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20">
          {/* Logo - Luxury Style */}
          <a href="/" className="flex-shrink-0 flex items-center mr-12">
            <div className="w-14 h-14 flex items-center justify-center bg-[#1C1917] rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#CA8A04]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="ml-3 text-xl font-semibold text-[#1C1917] tracking-wide" style={{ fontFamily: 'Cormorant, serif' }}>
              紫砂陶艺
            </span>
          </a>
          
          {/* Navigation links - Luxury Style */}
          <div className="flex items-center space-x-10">
            <a href="/deals" className="text-sm font-medium text-[#CA8A04] border-b-2 border-[#CA8A04] pb-5 tracking-wide transition-all duration-300">
              今日特惠
            </a>
            <a href="/products" className="text-sm font-medium text-[#44403C] hover:text-[#CA8A04] pb-5 tracking-wide transition-colors duration-300">
              所有商品
            </a>
            <a href="/customize" className="text-sm font-medium text-[#44403C] hover:text-[#CA8A04] pb-5 tracking-wide transition-colors duration-300">
              定制服务
            </a>
            <a href="/flash-sale" className="text-sm font-medium text-[#44403C] hover:text-[#CA8A04] pb-5 tracking-wide transition-colors duration-300">
              一元购
            </a>
          </div>
          
          {/* Search bar and user controls - Luxury Style */}
          <div className="flex-1 flex justify-end items-center space-x-6">
            <div className="flex items-center">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-[#E7E5E4] border-r-0 rounded-l-sm px-4 py-2.5 text-sm bg-white text-[#44403C] focus:outline-none focus:border-[#CA8A04] transition-colors duration-300"
              >
                <option value="全部">全部</option>
                <option value="teapots">茶壶</option>
                <option value="cups">茶杯</option>
                <option value="accessories">配件</option>
                <option value="sets">套装</option>
              </select>
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索商品..."
                  className="border border-[#E7E5E4] px-4 py-2.5 text-sm w-64 text-[#44403C] placeholder-[#A8A29E] focus:outline-none focus:border-[#CA8A04] transition-colors duration-300"
                />
                <button 
                  type="submit"
                  className="bg-[#CA8A04] hover:bg-[#B47C03] text-white px-5 py-2.5 transition-all duration-300 rounded-r-sm"
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
                className="text-sm text-[#44403C] hover:text-[#CA8A04] transition-colors duration-300 tracking-wide"
              >
                中文
              </button>
              <a href="/cart" className="relative group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#44403C] group-hover:text-[#CA8A04] transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#CA8A04] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {totalItems}
                  </span>
                )}
              </a>
              <a href={isAuthenticated ? "/profile" : "/login"} className="group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#44403C] group-hover:text-[#CA8A04] transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
