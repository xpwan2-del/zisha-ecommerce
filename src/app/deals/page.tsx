"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FeaturedProducts } from "@/components/FeaturedProducts";

export default function DealsPage() {
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState("all");

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background, #fafaf9)' }}>
      <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--heading-font)' }}>
            {t("nav.deals", "今日特惠")}
          </h1>
          <p className="text-white/80">限时优惠，抢购从速！</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
            <div 
              onClick={() => setActiveType("all")}
              className={`group cursor-pointer relative min-w-0 transition-all duration-300 ${activeType === "all" ? 'border-[var(--accent)] shadow-lg' : 'border-[var(--border)]'}`}
            >
              <div className={`absolute top-0 left-0 right-0 h-[1px] bg-[var(--accent)] transition-transform duration-500 origin-left ${activeType === "all" ? 'scale-x-100' : 'scale-x-0'} group-hover:scale-x-100`}></div>
              <div className="p-2 sm:p-3 text-center bg-white border h-full">
                <span className={`text-[10px] sm:text-xs tracking-widest ${activeType === "all" ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>01</span>
                <h3 className={`text-xs sm:text-sm font-normal mt-1 ${activeType === "all" ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`} style={{ fontFamily: 'var(--heading-font)' }}>
                  {t('deals.all') || '全部'}
                </h3>
                <div className={`w-4 h-px mx-auto mt-1 transition-all ${activeType === "all" ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}></div>
              </div>
              <div className={`absolute bottom-0 right-0 w-4 h-4 ${activeType === "all" ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-[var(--accent)]"></div>
              </div>
            </div>
            <div 
              onClick={() => setActiveType("flash_sale")}
              className={`group cursor-pointer relative min-w-0 transition-all duration-300 ${activeType === "flash_sale" ? 'border-[var(--accent)] shadow-lg' : 'border-[var(--border)]'}`}
            >
              <div className={`absolute top-0 left-0 right-0 h-[1px] bg-[var(--accent)] transition-transform duration-500 origin-left ${activeType === "flash_sale" ? 'scale-x-100' : 'scale-x-0'} group-hover:scale-x-100`}></div>
              <div className="p-2 sm:p-3 text-center bg-white border h-full">
                <span className={`text-[10px] sm:text-xs tracking-widest ${activeType === "flash_sale" ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>02</span>
                <h3 className={`text-xs sm:text-sm font-normal mt-1 ${activeType === "flash_sale" ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`} style={{ fontFamily: 'var(--heading-font)' }}>
                  {t('deals.flash_sale') || '特惠'}
                </h3>
                <div className={`w-4 h-px mx-auto mt-1 transition-all ${activeType === "flash_sale" ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}></div>
              </div>
              <div className={`absolute bottom-0 right-0 w-4 h-4 ${activeType === "flash_sale" ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-[var(--accent)]"></div>
              </div>
            </div>
            <div 
              onClick={() => setActiveType("daily_deals")}
              className={`group cursor-pointer relative min-w-0 transition-all duration-300 ${activeType === "daily_deals" ? 'border-[var(--accent)] shadow-lg' : 'border-[var(--border)]'}`}
            >
              <div className={`absolute top-0 left-0 right-0 h-[1px] bg-[var(--accent)] transition-transform duration-500 origin-left ${activeType === "daily_deals" ? 'scale-x-100' : 'scale-x-0'} group-hover:scale-x-100`}></div>
              <div className="p-2 sm:p-3 text-center bg-white border h-full">
                <span className={`text-[10px] sm:text-xs tracking-widest ${activeType === "daily_deals" ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>03</span>
                <h3 className={`text-xs sm:text-sm font-normal mt-1 ${activeType === "daily_deals" ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`} style={{ fontFamily: 'var(--heading-font)' }}>
                  {t('deals.daily_deals') || '今日'}
                </h3>
                <div className={`w-4 h-px mx-auto mt-1 transition-all ${activeType === "daily_deals" ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}></div>
              </div>
              <div className={`absolute bottom-0 right-0 w-4 h-4 ${activeType === "daily_deals" ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-[var(--accent)]"></div>
              </div>
            </div>
          </div>
        </div>

        <FeaturedProducts category={activeType} pageType="deals" />
      </div>
    </div>
  );
}