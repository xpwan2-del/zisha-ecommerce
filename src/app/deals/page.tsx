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
  activities: { id: number; name: string; name_en: string; icon: string; color: string }[];
}

export default function DealsPage() {
  const { t, i18n } = useTranslation();
  const { currency } = useCurrency();
  const [products, setProducts] = useState<DealProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { id: "all", name: "全部", name_en: "All" },
    { id: "teapots", name: "茶壶", name_en: "Teapots" },
    { id: "cups", name: "茶杯", name_en: "Cups" },
    { id: "accessories", name: "配件", name_en: "Accessories" },
    { id: "sets", name: "套组", name_en: "Sets" },
  ];

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
    if (activeCategory === "teapots") return product.name_en?.toLowerCase().includes("teapot") || product.name?.includes("壶");
    if (activeCategory === "cups") return product.name_en?.toLowerCase().includes("cup") || product.name?.includes("杯");
    if (activeCategory === "accessories") return product.name_en?.toLowerCase().includes("accessory") || product.name?.includes("配件");
    if (activeCategory === "sets") return product.name_en?.toLowerCase().includes("set") || product.name?.includes("套");
    return true;
  });

  const getActivityName = (activity: any) => {
    if (i18n.language === "zh") return activity.name;
    if (i18n.language === "ar") return activity.name_ar || activity.name_en || activity.name;
    return activity.name_en || activity.name;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-r from-amazon-orange to-orange-500 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2">{t("nav.deals", "今日特惠")}</h1>
          <p className="text-white/80">限时优惠，抢购从速！</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex overflow-x-auto gap-2 mb-8 pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-amazon-orange text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {i18n.language === "zh" ? cat.name : cat.name_en}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amazon-orange"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <div className="flex justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-amazon-dark dark:text-white mb-4">
              暂无特惠商品
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              限时特惠活动正在准备中，敬请期待！
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 bg-amazon-orange hover:bg-orange-600 text-white font-medium rounded-md transition-colors"
            >
              {t("products.viewAll", "浏览所有商品")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group"
              >
                <div className="aspect-square relative overflow-hidden">
                  {product.discount > 0 && (
                    <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-sm font-bold px-2 py-1 rounded">
                      -{product.discount}%
                    </div>
                  )}
                  {product.is_limited && (
                    <div className="absolute top-2 right-2 z-10 bg-amazon-orange text-white text-xs font-bold px-2 py-1 rounded">
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
                  <div className="flex flex-wrap gap-1 mb-2">
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
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-amazon-orange transition-colors">
                      {i18n.language === "zh" ? product.name : i18n.language === "ar" ? product.name_ar : product.name_en || product.name}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-red-500">
                      {formatCurrency(convertCurrency(product.price, "aed", currency), currency)}
                    </span>
                    {product.original_price > product.price && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatCurrency(convertCurrency(product.original_price, "aed", currency), currency)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {t("products.stock", { count: product.stock })}
                    </span>
                    <Link
                      href={`/products/${product.id}`}
                      className="text-sm font-medium text-amazon-orange hover:text-orange-600 transition-colors"
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
