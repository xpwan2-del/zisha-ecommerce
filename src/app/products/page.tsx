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
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="bg-gradient-to-r from-[#CA8A04] to-[#D9A51B] text-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Cormorant, serif' }}>{t('products.title')}</h1>
          <p className="text-white/80">精选紫砂壶，传承千年工艺</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category filter - Luxury Style */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <button
            key="all"
            onClick={() => {
              router.push('/products');
            }}
            className={`px-6 py-3 rounded-sm text-sm font-medium tracking-wide transition-all duration-300 ${selectedCategory === 'all' 
              ? 'bg-[#CA8A04] text-white shadow-lg shadow-[#CA8A04]/20' 
              : 'bg-white border border-[#E7E5E4] text-[#44403C] hover:border-[#CA8A04] hover:shadow-sm'}`}
          >
            {t('products.all') || '全部'}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                router.push(`/products?category=${category.id}`);
              }}
              className={`px-6 py-3 rounded-sm text-sm font-medium tracking-wide transition-all duration-300 ${selectedCategory === category.id.toString() 
                ? 'bg-[#CA8A04] text-white shadow-lg shadow-[#CA8A04]/20' 
                : 'bg-white border border-[#E7E5E4] text-[#44403C] hover:border-[#CA8A04] hover:shadow-sm'}`}
            >
              {i18n.language === 'zh' ? category.name : i18n.language === 'en' ? category.name_en : category.name_ar}
            </button>
          ))}
        </div>
        
        {/* Use FeaturedProducts component */}
        <FeaturedProducts category={selectedCategory} />
      </div>
    </div>
  );
}
