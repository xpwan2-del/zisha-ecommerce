"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";

export default function DealsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-amazon-dark dark:text-white mb-8">
          {t("nav.deals", "今日特惠")}
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
          <div className="flex justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-amazon-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-amazon-dark dark:text-white mb-4">
            即将推出 - Coming Soon
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
      </div>
    </div>
  );
}