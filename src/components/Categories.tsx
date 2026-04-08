"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface HomeData {
  modules: any[];
  guarantees: any[];
  categories: any[];
  products: {
    products: any[];
    total: number;
    totalPages: number;
  };
}

interface CategoriesProps {
  data: HomeData;
}

export function Categories({ data }: CategoriesProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [activeCategory, setActiveCategory] = useState("all");
  
  // 从 props 中获取分类数据
  const categories = data.categories || [];

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
    <section className="py-12 px-4 bg-[#FDF2F8] middle-east-pattern">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8 font-['Noto_Naskh_Arabic'] text-[#831843]">{t('categories.title')}</h2>
        
        {/* 移动端的Tab控件 */}
        <div className="md:hidden mb-6">
          <div className="flex overflow-x-auto scrollbar-hide border-b border-[#DB2777]/20">
            <Link
              href="/products"
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 ${activeCategory === 'all' ? 'border-[#CA8A04] text-[#CA8A04]' : 'border-transparent text-[#831843] hover:text-[#CA8A04]'} transition-colors duration-300 font-['Noto_Sans_Arabic']`}
            >
              全部
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.id}`}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 ${activeCategory === category.id.toString() ? 'border-[#CA8A04] text-[#CA8A04]' : 'border-transparent text-[#831843] hover:text-[#CA8A04]'} transition-colors duration-300 font-['Noto_Sans_Arabic']`}
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
            className={`bg-white/80 glass-effect px-6 py-4 rounded-md shadow-sm border border-[#DB2777]/20 transition-all duration-300 hover:shadow-md hover:bg-white/90 text-center min-w-[120px] ${activeCategory === 'all' ? 'border-[#CA8A04] bg-white/90' : ''}`}
          >
            <h3 className="text-lg font-semibold mb-1 font-['Noto_Naskh_Arabic'] text-[#831843]">全部</h3>
            <p className="text-xs text-[#831843]/70 font-['Noto_Sans_Arabic']">所有产品</p>
          </Link>
          {categories.map((category) => (
            <Link 
              key={category.id} 
              href={`/products?category=${category.id}`}
              className={`bg-white/80 glass-effect px-6 py-4 rounded-md shadow-sm border border-[#DB2777]/20 transition-all duration-300 hover:shadow-md hover:bg-white/90 text-center min-w-[120px] ${activeCategory === category.id.toString() ? 'border-[#CA8A04] bg-white/90' : ''}`}
            >
              <h3 className="text-lg font-semibold mb-1 font-['Noto_Naskh_Arabic'] text-[#831843]">{category.name}</h3>
              <p className="text-xs text-[#831843]/70 font-['Noto_Sans_Arabic']">{category.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}