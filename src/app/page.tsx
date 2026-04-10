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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 并行获取数据
        const [homeResponse, productsResponse] = await Promise.all([
          fetch('/api/home'),
          fetch('/api/products?limit=20')
        ]);

        if (!homeResponse.ok) throw new Error('Failed to fetch home data');
        if (!productsResponse.ok) throw new Error('Failed to fetch products data');

        const homeData = await homeResponse.json();
        const productsResponseData = await productsResponse.json();

        console.log('Products API response:', productsResponseData);
        console.log('Products API data:', productsResponseData.data);

        setHomeData(homeData);
        // 只传递API响应中的data字段给FeaturedProducts组件
        setProductsData(productsResponseData.data);
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

  if (error || !homeData || !productsData) {
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
      <Categories data={homeData} />
      <FeaturedProducts data={productsData} />
    </div>
  );
}
