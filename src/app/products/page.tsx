"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { FeaturedProducts } from '@/components/FeaturedProducts';

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-xl">Loading...</div></div>}>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');

  // Sync selectedCategory with URL when URL changes
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category') || 'all';
    setSelectedCategory(categoryFromUrl);
  }, [searchParams]);

  // 加载分类
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        if (data && data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        } else if (Array.isArray(data)) {
          setCategories(data);
        } else {
          console.error('Categories data is not an array:', data);
          setCategories([]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      }
    }
    fetchCategories();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-accent to-secondary text-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Cormorant, serif' }}>{t('products.title')}</h1>
          <p className="text-white/80">精选紫砂壶，传承千年工艺</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category filter - Fixed 6 columns responsive */}
        <div className="mb-8">
          <div className="grid grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            <div 
              key="all"
              onClick={() => router.push('/products')}
              className={`group cursor-pointer relative min-w-0 transition-all duration-300 ${selectedCategory === 'all' ? 'border-accent shadow-lg shadow-accent/10' : 'border-border shadow-sm'}`}
            >
              <div className={`absolute top-0 left-0 right-0 h-[1px] bg-accent transition-transform duration-500 origin-left ${selectedCategory === 'all' ? 'scale-x-100' : 'scale-x-0'} group-hover:scale-x-100`}></div>
              <div className="p-3 sm:p-4 lg:p-5 text-center bg-white border h-full">
                <span className={`text-[10px] sm:text-xs tracking-widest transition-colors duration-300 ${selectedCategory === 'all' ? 'text-accent' : 'text-text-muted'}`}>01</span>
                <h3 className={`text-sm sm:text-base lg:text-lg font-normal mt-1 sm:mt-2 mb-1 transition-colors duration-300 ${selectedCategory === 'all' ? 'text-accent' : 'text-dark'}`} style={{ fontFamily: 'Cormorant, serif' }}>
                  {t('products.all') || '全部'}
                </h3>
                <p className="text-[10px] sm:text-xs text-text-muted tracking-[0.2em] uppercase mb-2 sm:mb-3 hidden sm:block">All Products</p>
                <div className={`w-4 sm:w-6 h-px mx-auto mb-2 sm:mb-3 transition-all duration-500 ${selectedCategory === 'all' ? 'w-full sm:w-8 md:w-12 bg-accent' : 'bg-border'}`}></div>
                <p className="text-[10px] text-text-muted font-light tracking-wide hidden md:block">全部精选 · 匠心之作</p>
                <div className={`mt-2 sm:mt-3 overflow-hidden transition-all duration-500 ${selectedCategory === 'all' ? 'opacity-100 max-h-8' : 'opacity-0 max-h-0'}`}>
                  <span className="inline-flex items-center text-[10px] text-accent tracking-widest uppercase">
                    <svg className="w-2 h-2 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className={`absolute bottom-0 right-0 w-4 sm:w-6 h-4 sm:h-6 transition-opacity duration-500 ${selectedCategory === 'all' ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute bottom-1 right-1 w-2 sm:w-3 h-2 sm:h-3 border-r border-b border-accent"></div>
              </div>
            </div>
            {categories.map((category, index) => {
              const categoryEnNames = ['Teapots', 'Tea Cups', 'Accessories', 'Gift Sets'];
              const categoryDescs = ['传世之作 · 匠心独运', '品茗雅器 · 温润如玉', '茶道配件 · 精致考究', '礼赠佳品 · 尊贵典雅'];
              return (
              <div 
                key={category.id}
                onClick={() => router.push(`/products?category=${category.id}`)}
                className={`group cursor-pointer relative min-w-0 transition-all duration-300 ${selectedCategory === category.id.toString() ? 'border-accent shadow-lg shadow-accent/10' : 'border-border shadow-sm'}`}
              >
                <div className={`absolute top-0 left-0 right-0 h-[1px] bg-accent transition-transform duration-500 origin-left ${selectedCategory === category.id.toString() ? 'scale-x-100' : 'scale-x-0'} group-hover:scale-x-100`}></div>
                <div className="p-3 sm:p-4 lg:p-5 text-center bg-white border h-full">
                  <span className={`text-[10px] sm:text-xs tracking-widest transition-colors duration-300 ${selectedCategory === category.id.toString() ? 'text-accent' : 'text-text-muted'}`}>
                    0{index + 2}
                  </span>
                  <h3 className={`text-sm sm:text-base lg:text-lg font-normal mt-1 sm:mt-2 mb-1 transition-colors duration-300 ${selectedCategory === category.id.toString() ? 'text-accent' : 'text-dark'}`} style={{ fontFamily: 'Cormorant, serif' }}>
                    {i18n.language === 'zh' ? category.name : i18n.language === 'en' ? category.name_en : category.name_ar}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-text-muted tracking-[0.2em] uppercase mb-2 sm:mb-3 hidden sm:block">{categoryEnNames[index] || category.name_en}</p>
                  <div className={`w-4 sm:w-6 h-px mx-auto mb-2 sm:mb-3 transition-all duration-500 ${selectedCategory === category.id.toString() ? 'w-full sm:w-8 md:w-12 bg-accent' : 'bg-border'}`}></div>
                  <p className="text-[10px] text-text-muted font-light tracking-wide hidden md:block">{categoryDescs[index] || ''}</p>
                  <div className={`mt-2 sm:mt-3 overflow-hidden transition-all duration-500 ${selectedCategory === category.id.toString() ? 'opacity-100 max-h-8' : 'opacity-0 max-h-0'}`}>
                    <span className="inline-flex items-center text-[10px] text-accent tracking-widest uppercase">
                      <svg className="w-2 h-2 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className={`absolute bottom-0 right-0 w-4 sm:w-6 h-4 sm:h-6 transition-opacity duration-500 ${selectedCategory === category.id.toString() ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="absolute bottom-1 right-1 w-2 sm:w-3 h-2 sm:h-3 border-r border-b border-accent"></div>
                </div>
              </div>
            )})}
          </div>
        </div>
        
        {/* Use FeaturedProducts component */}
        <FeaturedProducts category={selectedCategory} />
      </div>
    </div>
  );
}
