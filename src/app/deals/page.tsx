"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FeaturedProducts } from "@/components/FeaturedProducts";

export default function DealsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background, #fafaf9)' }}>
      <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--heading-font)' }}>
            {t("nav.deals", "今日特惠")}
          </h1>
          <p className="text-white/80">限时优惠，抢购从速！</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FeaturedProducts category="all" pageType="deals" />
      </div>
    </div>
  );
}
