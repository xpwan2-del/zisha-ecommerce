"use client";

import { useState, useEffect } from 'react';
import { HomeModules } from '@/components/HomeModules';
import { Categories } from '@/components/Categories';
import { FeaturedProducts } from '@/components/FeaturedProducts';

export default function Home() {
  const [homeData, setHomeData] = useState<any>(null);
  const [productsData, setProductsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 只获取home数据，产品数据由FeaturedProducts组件自己获取
        const homeResponse = await fetch('/api/home');

        if (!homeResponse.ok) throw new Error('Failed to fetch home data');

        const homeData = await homeResponse.json();

        setHomeData(homeData);
        // 不再传递产品数据，让FeaturedProducts组件自己获取
        setProductsData(null);
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAF9]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-[#CA8A04] border-t-transparent" role="status"></div>
          <p className="mt-4 text-[#78716C] text-sm tracking-wide">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !homeData) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAF9]">
        <div className="text-center">
          <p className="text-[#1C1917] text-lg mb-4">{error || 'Failed to load data'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#CA8A04] text-white rounded-sm hover:bg-[#B47C03] transition-colors duration-300"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#0C0A09]">
      <HomeModules data={homeData} />
      <Categories onCategorySelect={setSelectedCategory} />
      <FeaturedProducts category={selectedCategory} />
    </div>
  );
}
