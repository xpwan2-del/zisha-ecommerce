"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useCurrency } from "@/lib/contexts/CurrencyContext";
import { convertCurrency, formatCurrency } from "@/lib/utils/currency";

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
  const [activeCategory, setActiveCategory] = useState("all");
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        if (data && data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        } else if (Array.isArray(data)) {
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    }
    fetchCategories();
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
    return product.category_id?.toString() === activeCategory;
  });

  const getActivityName = (activity: any) => {
    if (i18n.language === "zh") return activity.name;
    if (i18n.language === "ar") return activity.name_ar || activity.name_en || activity.name;
    return activity.name_en || activity.name;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="bg-gradient-to-r from-[#CA8A04] to-[#D9A51B] text-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Cormorant, serif' }}>{t("nav.deals", "今日特惠")}</h1>
          <p className="text-white/80">限时优惠，抢购从速！</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category filter - Luxury Style */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-6 py-3 rounded-sm text-sm font-medium tracking-wide transition-all duration-300 ${activeCategory === "all" 
              ? 'bg-[#CA8A04] text-white shadow-lg shadow-[#CA8A04]/20' 
              : 'bg-white border border-[#E7E5E4] text-[#44403C] hover:border-[#CA8A04] hover:shadow-sm'}`}
          >
            {t('products.all') || '全部'}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id.toString())}
              className={`px-6 py-3 rounded-sm text-sm font-medium tracking-wide transition-all duration-300 ${activeCategory === category.id.toString() 
                ? 'bg-[#CA8A04] text-white shadow-lg shadow-[#CA8A04]/20' 
                : 'bg-white border border-[#E7E5E4] text-[#44403C] hover:border-[#CA8A04] hover:shadow-sm'}`}
            >
              {i18n.language === 'zh' ? category.name : i18n.language === 'en' ? category.name_en : category.name_ar}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CA8A04]"></div>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-[#E7E5E4] rounded-sm overflow-hidden hover:shadow-lg transition-all duration-300 group"
              >
                <div className="aspect-square relative overflow-hidden">
                  {product.discount > 0 && (
                    <div className="absolute top-2 left-2 z-10 bg-[#CA8A04] text-white text-sm font-bold px-3 py-1 rounded-sm">
                      -{product.discount}%
                    </div>
                  )}
                  {product.is_limited && (
                    <div className="absolute top-2 right-2 z-10 bg-[#CA8A04] text-white text-xs font-bold px-3 py-1 rounded-sm">
                      限量
                    </div>
                  )}
                  <Link href={`/products/${product.id}`}>
                    <img
                      src={product.images?.[0] || product.image || "https://placehold.co/400x400/e8d4c4/ffffff?text=Zisha"}
                      alt={i18n.language === "zh" ? product.name : i18n.language === "ar" ? product.name_ar : product.name_en || product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                </div>

                <div className="p-4">
                  <div className="flex flex-wrap gap-1 mb-3">
                    {product.activities?.slice(0, 2).map((activity) => (
                      <span
                        key={activity.id}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: activity.color + "20", color: activity.color }}
                      >
                        {getActivityName(activity)}
                      </span>
                    ))}
                  </div>

                  <Link href={`/products/${product.id}`}>
                    <h3 className="text-sm font-medium text-[#1C1917] mb-2 line-clamp-2 hover:text-[#CA8A04] transition-colors">
                      {i18n.language === "zh" ? product.name : i18n.language === "ar" ? product.name_ar : product.name_en || product.name}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg font-bold text-[#CA8A04]">
                      {formatCurrency(convertCurrency(product.price, "aed", currency), currency)}
                    </span>
                    {product.original_price > 0 && product.original_price > product.price && (
                      <span className="text-sm text-[#A8A29E] line-through">
                        {formatCurrency(convertCurrency(product.original_price, "aed", currency), currency)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#78716C]">
                      {t("products.stock", { count: product.stock })}
                    </span>
                    <Link
                      href={`/products/${product.id}`}
                      className="text-sm font-medium text-[#CA8A04] hover:underline transition-colors"
                    >
                      {t("products.view", "查看")}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
