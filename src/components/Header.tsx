"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    if (pathname === '/products') {
      const params = new URLSearchParams(window.location.search);
      setActiveCategory(params.get('category') || 'all');
    } else {
      setActiveCategory('all');
    }
  }, [pathname]);

  useEffect(() => {
    fetch('/api/system-configs?key=logo_url')
      .then(res => res.json())
      .then(data => {
        if (data?.config_value) {
          setLogoUrl(data.config_value);
        }
      })
      .catch(console.error);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setIsLangDropdownOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white text-[#450A0A] shadow-lg">
      {/* 顶部信息栏 */}
      <div className="bg-[#FEF2F2] border-b border-[#7C2D12]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center sm:justify-end items-center h-10 space-x-4 sm:space-x-8">
            <a href="/reviews" className="text-xs text-[#450A0A] hover:text-[#CA8A04] transition-colors duration-300 font-['Noto_Sans_TC']">
              {t("nav.reviews", "用户评价")}
            </a>
            <a href="/about" className="text-xs text-[#450A0A] hover:text-[#CA8A04] transition-colors duration-300 font-['Noto_Sans_TC']">
              {t("nav.about", "关于我们")}
            </a>
            <a href="/contact" className="text-xs text-[#450A0A] hover:text-[#CA8A04] transition-colors duration-300 font-['Noto_Sans_TC']">
              {t("nav.contact", "联系我们")}
            </a>
          </div>
        </div>
      </div>
      {/* 顶部导航栏 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="flex-shrink-0">
              <img src={logoUrl} alt="Zisha" className="h-14 sm:h-16 w-auto" />
            </a>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              <a href="/deals" className="border-[#CA8A04] text-[#450A0A] border-b-2 px-4 py-3 text-sm font-medium hover:text-[#CA8A04] transition-colors duration-300 font-['Noto_Sans_TC'] whitespace-nowrap">
                {t("nav.deals", "今日特惠")}
              </a>
              <a href="/products" className="border-transparent hover:text-[#CA8A04] px-4 py-3 text-sm font-medium transition-colors duration-300 font-['Noto_Sans_TC'] whitespace-nowrap">
                {t("nav.allProducts", "所有商品")}
              </a>
              <a href="/customize" className="border-transparent hover:text-[#CA8A04] px-4 py-3 text-sm font-medium transition-colors duration-300 font-['Noto_Sans_TC'] whitespace-nowrap">
                {t("nav.customize", "定制服务")}
              </a>
              <a href="/lucky-draws" className="border-transparent hover:text-[#CA8A04] px-4 py-3 text-sm font-medium transition-colors duration-300 font-['Noto_Sans_TC'] whitespace-nowrap">
                {t("nav.luckyDraw", "一元购")}
              </a>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center">
              <form onSubmit={handleSearch} className="flex items-center">
                <select className="bg-[#FEF2F2] text-[#450A0A] px-3 py-2 rounded-l-md border-r-0 border border-[#7C2D12]/30 font-['Noto_Sans_TC']">
                  <option value="all">{t("products.all", "全部")}</option>
                  <option value="teapots">{t("categories.items.0", "茶壶")}</option>
                  <option value="cups">{t("categories.items.1", "茶杯")}</option>
                  <option value="sets">{t("categories.items.2", "套组")}</option>
                </select>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("header.search", "搜索商品...")}
                  className="w-64 px-4 py-2 border-l-0 border border-[#7C2D12]/30 rounded-l-none focus:outline-none focus:ring-2 focus:ring-[#CA8A04] font-['Noto_Sans_TC']"
                />
                <button
                  type="submit"
                  className="ml-0 px-4 py-2 bg-[#CA8A04] text-white hover:bg-[#B47C03] transition-colors duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          {/* 右侧功能区 */}
          <div className="flex items-center space-x-3 sm:space-x-6">
            {/* 语言切换 */}
            <div className="relative">
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center space-x-2 hover:text-[#CA8A04] transition-colors duration-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline text-sm font-['Noto_Sans_TC'] whitespace-nowrap">{i18n.language === "zh" ? "中文" : i18n.language === "ar" ? "العربية" : "English"}</span>
              </button>
              {isLangDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-1 z-50 border border-[#7C2D12]/20">
                  <button
                    onClick={() => changeLanguage("zh")}
                    className={`block w-full text-left px-4 py-2 text-sm ${i18n.language === "zh" ? "bg-[#CA8A04] text-white" : "text-[#450A0A] hover:bg-[#FEF2F2]"} font-['Noto_Sans_TC']`}
                  >
                    中文
                  </button>
                  <button
                    onClick={() => changeLanguage("en")}
                    className={`block w-full text-left px-4 py-2 text-sm ${i18n.language === "en" ? "bg-[#CA8A04] text-white" : "text-[#450A0A] hover:bg-[#FEF2F2]"} font-['Noto_Sans_TC']`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => changeLanguage("ar")}
                    className={`block w-full text-left px-4 py-2 text-sm ${i18n.language === "ar" ? "bg-[#CA8A04] text-white" : "text-[#450A0A] hover:bg-[#FEF2F2]"} font-['Noto_Sans_TC']`}
                  >
                    العربية
                  </button>
                </div>
              )}
            </div>

            {/* 购物车 */}
            <a href="/cart" className="flex items-center hover:text-[#CA8A04] transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </a>

            {/* 用户账户 */}
            <a href="/account" className="flex items-center hover:text-[#CA8A04] transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </a>

            {/* 汉堡菜单按钮 */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden flex items-center justify-center p-2 rounded-md hover:bg-[#FEF2F2] transition-colors duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* 移动端搜索框 */}
        <div className="md:hidden pb-4">
          <form onSubmit={handleSearch} className="flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("header.search", "搜索商品...")}
              className="flex-1 px-4 py-3 border border-[#7C2D12]/30 rounded-l-md focus:outline-none focus:ring-2 focus:ring-[#CA8A04] font-['Noto_Sans_TC']"
            />
            <button
              type="submit"
              className="px-4 py-3 bg-[#CA8A04] text-white hover:bg-[#B47C03] transition-colors duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </div>

        {/* 手机端分类Tab */}
        <div className="md:hidden bg-white border-t border-[#7C2D12]/20">
          <div className="flex overflow-x-auto scrollbar-hide">
            <button
              onClick={() => router.push('/products')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 ${activeCategory === 'all' ? 'border-[#CA8A04] text-[#CA8A04]' : 'border-transparent text-[#450A0A] hover:text-[#CA8A04]'} transition-colors duration-300 font-['Noto_Sans_TC'] whitespace-nowrap`}
            >
              全部
            </button>
            <button
              onClick={() => router.push('/products?category=1')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 ${activeCategory === '1' ? 'border-[#CA8A04] text-[#CA8A04]' : 'border-transparent text-[#450A0A] hover:text-[#CA8A04]'} transition-colors duration-300 font-['Noto_Sans_TC'] whitespace-nowrap`}
            >
              紫砂壶
            </button>
            <button
              onClick={() => router.push('/products?category=2')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 ${activeCategory === '2' ? 'border-[#CA8A04] text-[#CA8A04]' : 'border-transparent text-[#450A0A] hover:text-[#CA8A04]'} transition-colors duration-300 font-['Noto_Sans_TC'] whitespace-nowrap`}
            >
              茶杯
            </button>
            <button
              onClick={() => router.push('/products?category=3')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 ${activeCategory === '3' ? 'border-[#CA8A04] text-[#CA8A04]' : 'border-transparent text-[#450A0A] hover:text-[#CA8A04]'} transition-colors duration-300 font-['Noto_Sans_TC'] whitespace-nowrap`}
            >
              茶叶罐
            </button>
            <button
              onClick={() => router.push('/products?category=4')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 ${activeCategory === '4' ? 'border-[#CA8A04] text-[#CA8A04]' : 'border-transparent text-[#450A0A] hover:text-[#CA8A04]'} transition-colors duration-300 font-['Noto_Sans_TC'] whitespace-nowrap`}
            >
              套装
            </button>
          </div>
        </div>

        {/* 移动端导航菜单 */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-[#7C2D12]/20 py-4">
            <div className="flex flex-col space-y-3">
              <a href="/deals" onClick={closeMobileMenu} className="block px-4 py-3 text-base font-medium text-[#450A0A] hover:bg-[#FEF2F2] rounded-md transition-colors duration-300 font-['Noto_Sans_TC']">
                {t("nav.deals", "今日特惠")}
              </a>
              <a href="/products" onClick={closeMobileMenu} className="block px-4 py-3 text-base font-medium text-[#450A0A] hover:bg-[#FEF2F2] rounded-md transition-colors duration-300 font-['Noto_Sans_TC']">
                {t("nav.allProducts", "所有商品")}
              </a>
              <a href="/customize" onClick={closeMobileMenu} className="block px-4 py-3 text-base font-medium text-[#450A0A] hover:bg-[#FEF2F2] rounded-md transition-colors duration-300 font-['Noto_Sans_TC']">
                {t("nav.customize", "定制服务")}
              </a>
              <a href="/lucky-draws" onClick={closeMobileMenu} className="block px-4 py-3 text-base font-medium text-[#450A0A] hover:bg-[#FEF2F2] rounded-md transition-colors duration-300 font-['Noto_Sans_TC']">
                {t("nav.luckyDraw", "一元购")}
              </a>
              <a href="/reviews" onClick={closeMobileMenu} className="block px-4 py-3 text-base font-medium text-[#450A0A] hover:bg-[#FEF2F2] rounded-md transition-colors duration-300 font-['Noto_Sans_TC']">
                {t("nav.reviews", "用户评价")}
              </a>
              <a href="/about" onClick={closeMobileMenu} className="block px-4 py-3 text-base font-medium text-[#450A0A] hover:bg-[#FEF2F2] rounded-md transition-colors duration-300 font-['Noto_Sans_TC']">
                {t("nav.about", "关于我们")}
              </a>
              <a href="/contact" onClick={closeMobileMenu} className="block px-4 py-3 text-base font-medium text-[#450A0A] hover:bg-[#FEF2F2] rounded-md transition-colors duration-300 font-['Noto_Sans_TC']">
                {t("nav.contact", "联系我们")}
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}