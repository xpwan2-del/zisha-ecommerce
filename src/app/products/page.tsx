"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { Categories } from "@/components/Categories";

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string | number>("all");
  const [homeData, setHomeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHomeData() {
      try {
        const response = await fetch('/api/home');
        const data = await response.json();
        setHomeData(data);
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchHomeData();
  }, []);

  const handleCategorySelect = (categoryId: string | number) => {
    setActiveCategory(categoryId);
  };

  if (loading || !homeData) {
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
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Cormorant, serif' }}>{t("nav.products", "所有商品")}</h1>
          <p className="text-white/80">精选紫砂茶具，传承千年工艺</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Luxury Categories - Same as Home Page */}
        <Categories 
          data={homeData}
          selectedCategory={activeCategory}
          onCategorySelect={handleCategorySelect}
        />

        {/* Products Grid - Same as Home Page */}
        <FeaturedProducts category={activeCategory === "all" ? "all" : activeCategory.toString()} />
      </div>
    </div>
  );
}
