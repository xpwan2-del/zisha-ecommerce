"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function Categories() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [activeCategory, setActiveCategory] = useState("all");
  
  // 分类数据
  const categories = [
    { id: 1, name: "紫砂壶", name_en: "Teapots", description: "传统紫砂壶" },
    { id: 2, name: "茶杯", name_en: "Cups", description: "精美茶杯" },
    { id: 3, name: "茶叶罐", name_en: "Tea Caddy", description: "茶叶存储" },
    { id: 4, name: "套装", name_en: "Sets", description: "茶壶套装" }
  ];

  // 检测当前活动分类
  useEffect(() => {
    if (pathname === '/products') {
      const params = new URLSearchParams(window.location.search);
      setActiveCategory(params.get('category') || 'all');
    } else {
      setActiveCategory('all');
    }
  }, [pathname]);

  return (
    <section className="py-12 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8 font-['Noto_Serif_TC'] text-[#450A0A]">{t('categories.title')}</h2>
        
        {/* 移动端的Tab控件 */}
        <div className="md:hidden mb-6">
          <div className="flex overflow-x-auto scrollbar-hide border-b border-[#7C2D12]/20">
            <Link
              href="/products"
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 ${activeCategory === 'all' ? 'border-[#CA8A04] text-[#CA8A04]' : 'border-transparent text-[#450A0A] hover:text-[#CA8A04]'} transition-colors duration-300 font-['Noto_Sans_TC']`}
            >
              全部
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.id}`}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 ${activeCategory === category.id.toString() ? 'border-[#CA8A04] text-[#CA8A04]' : 'border-transparent text-[#450A0A] hover:text-[#CA8A04]'} transition-colors duration-300 font-['Noto_Sans_TC']`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
        
        {/* 桌面端的按钮 */}
        <div className="hidden md:flex flex-wrap justify-center gap-4">
          <Link 
            href="/products"
            className={`bg-[#FEF2F2] px-6 py-4 rounded-md shadow-sm border border-[#7C2D12]/20 transition-all duration-300 hover:shadow-md hover:bg-[#FEE7E7] text-center min-w-[120px] ${activeCategory === 'all' ? 'border-[#CA8A04] bg-[#FEE7E7]' : ''}`}
          >
            <h3 className="text-lg font-semibold mb-1 font-['Noto_Serif_TC'] text-[#450A0A]">全部</h3>
            <p className="text-xs text-[#450A0A]/70 font-['Noto_Sans_TC']">所有产品</p>
          </Link>
          {categories.map((category) => (
            <Link 
              key={category.id} 
              href={`/products?category=${category.id}`}
              className={`bg-[#FEF2F2] px-6 py-4 rounded-md shadow-sm border border-[#7C2D12]/20 transition-all duration-300 hover:shadow-md hover:bg-[#FEE7E7] text-center min-w-[120px] ${activeCategory === category.id.toString() ? 'border-[#CA8A04] bg-[#FEE7E7]' : ''}`}
            >
              <h3 className="text-lg font-semibold mb-1 font-['Noto_Serif_TC'] text-[#450A0A]">{category.name}</h3>
              <p className="text-xs text-[#450A0A]/70 font-['Noto_Sans_TC']">{category.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}