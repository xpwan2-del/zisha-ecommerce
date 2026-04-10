"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useCurrency } from "@/lib/contexts/CurrencyContext";
import { convertCurrency, formatCurrency } from "@/lib/utils/currency";
import { Categories } from "@/components/Categories";
import { ProductCard } from "@/components/ProductCard";

interface DealProduct {
  id: number;
  name: string;
  name_en: string;
  name_ar: string;
  price: number;
  original_price: number;
  image: string;
  images: string[];
  discount: number;
  is_limited: boolean;
  stock: number;
  category_id: number;
  activities: { id: number; name: string; name_en: string; icon: string; color: string }[];
}

export default function DealsPage() {
  const { t, i18n } = useTranslation();
  const { currency } = useCurrency();
  const [products, setProducts] = useState<DealProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | number>("all");
  const [homeData, setHomeData] = useState<any>(null);

  useEffect(() => {
    async function fetchHomeData() {
      try {
        const response = await fetch('/api/home');
        const data = await response.json();
        setHomeData(data);
      } catch (error) {
        console.error('Error fetching home data:', error);
      }
    }
    fetchHomeData();
  }, []);

  useEffect(() => {
    async function fetchDeals() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/products?limit=50&sort=deals");
        const data = await response.json();
        if (data.products) {
          const dealsProducts = data.products.filter((p: any) => p.discount > 0 || p.is_limited);
          setProducts(dealsProducts);
        }
      } catch (error) {
        console.error("Error fetching deals:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDeals();
  }, []);

  const filteredProducts = products.filter((product) => {
    if (product.discount <= 0) return false;
    if (activeCategory === "all") return true;
    return product.category_id?.toString() === activeCategory.toString();
  });

  const handleCategorySelect = (categoryId: string | number) => {
    setActiveCategory(categoryId);
  };

  if (isLoading || !homeData) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAF9]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-[#CA8A04] border-t-transparent" role="status"></div>
          <p className="mt-4 text-[#78716C] text-sm tracking-wide">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="bg-gradient-to-r from-[#CA8A04] to-[#D9A51B] text-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Cormorant, serif' }}>{t("nav.deals", "今日特惠")}</h1>
          <p className="text-white/80">限时优惠，抢购从速！</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Luxury Categories - Same as Home Page */}
        <Categories 
          data={homeData}
          selectedCategory={activeCategory}
          onCategorySelect={handleCategorySelect}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="bg-white rounded-md shadow-sm overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-[#E7E5E4] rounded-sm p-8 text-center">
            <div className="flex justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#A8A29E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-[#1C1917] mb-4" style={{ fontFamily: 'Cormorant, serif' }}>
              暂无特惠商品
            </h2>
            <p className="text-[#78716C] mb-8">
              限时特惠活动正在准备中，敬请期待！
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-8 py-4 bg-[#CA8A04] hover:bg-[#B47C03] text-white font-medium rounded-sm transition-colors duration-300 tracking-wide"
            >
              {t("products.viewAll", "浏览所有商品")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
