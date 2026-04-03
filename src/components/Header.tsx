"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

export function Header() {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsLangDropdownOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
  };

  return (
    <header className="bg-amazon-blue text-white shadow-md">
      {/* 顶部导航栏 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="flex-shrink-0">
              <span className="text-2xl font-bold">Zisha</span>
            </a>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <a href="/deals" className="border-amazon-orange text-white border-b-2 px-3 py-2 text-sm font-medium">
                {t("nav.deals", "今日特惠")}
              </a>
              <a href="/products" className="border-transparent hover:border-amazon-orange px-3 py-2 text-sm font-medium">
                {t("nav.allProducts", "所有商品")}
              </a>
              <a href="/customize" className="border-transparent hover:border-amazon-orange px-3 py-2 text-sm font-medium">
                {t("nav.customize", "定制服务")}
              </a>
              <a href="/lucky-draws" className="border-transparent hover:border-amazon-orange px-3 py-2 text-sm font-medium">
                {t("nav.luckyDraw", "一元购")}
              </a>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center">
              <form onSubmit={handleSearch} className="flex items-center">
                <select className="bg-gray-200 text-gray-800 px-2 py-2 rounded-l-md border-r-0 border">
                  <option value="all">{t("products.all", "全部")}</option>
                  <option value="teapots">{t("categories.items.0", "茶壶")}</option>
                  <option value="cups">{t("categories.items.1", "茶杯")}</option>
                  <option value="caddies">{t("categories.items.3", "配件")}</option>
                </select>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("products.search_placeholder", "搜索产品...")}
                  className="px-4 py-2 w-64 border border-r-0 focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                />
                <button
                  type="submit"
                  className="bg-amazon-orange hover:bg-amazon-light-orange text-white px-4 py-2 rounded-r-md"
                >
                  {t("products.search", "搜索")}
                </button>
              </form>
            </div>
          </div>

          {/* 用户菜单 */}
          <div className="flex items-center space-x-4">
            {/* 语言切换 */}
            <div className="relative">
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="text-sm font-medium hover:text-amazon-orange flex items-center gap-1"
              >
                {i18n.language === "zh" ? "中文" : i18n.language === "ar" ? "العربية" : "English"}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isLangDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg py-1 z-50">
                  <button
                    onClick={() => changeLanguage("zh")}
                    className={`block w-full text-left px-4 py-2 text-sm ${i18n.language === "zh" ? "bg-amazon-orange text-white" : "text-gray-800 hover:bg-gray-100"}`}
                  >
                    中文
                  </button>
                  <button
                    onClick={() => changeLanguage("en")}
                    className={`block w-full text-left px-4 py-2 text-sm ${i18n.language === "en" ? "bg-amazon-orange text-white" : "text-gray-800 hover:bg-gray-100"}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => changeLanguage("ar")}
                    className={`block w-full text-left px-4 py-2 text-sm ${i18n.language === "ar" ? "bg-amazon-orange text-white" : "text-gray-800 hover:bg-gray-100"}`}
                  >
                    العربية
                  </button>
                </div>
              )}
            </div>
            
            <a href="/account" className="text-sm font-medium hover:text-amazon-orange">
              {t("nav.account", "账户")}
            </a>
            <a href="/cart" className="text-sm font-medium hover:text-amazon-orange">
              {t("nav.cart", "购物车")}
            </a>
          </div>
        </div>
      </div>

      {/* 第二级导航 - Top Bar Manual */}
      <div className="bg-amazon-dark-blue py-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4">
            <a href="/" className="text-sm hover:text-amazon-orange px-3 py-2">
              {t("footer.links.home", "首页")}
            </a>
            <a href="/about" className="text-sm hover:text-amazon-orange px-3 py-2">
              {t("footer.links.about", "About Us")}
            </a>
            <a href="/contact" className="text-sm hover:text-amazon-orange px-3 py-2">
              {t("footer.links.contact", "Contact Us")}
            </a>
            <a href="/reviews" className="text-sm hover:text-amazon-orange px-3 py-2">
              {t("testimonials.title", "Customer Reviews")}
            </a>
            <a href="/admin" className="text-sm hover:text-amazon-orange px-3 py-2">
              {t("nav.admin", "后台管理")}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
