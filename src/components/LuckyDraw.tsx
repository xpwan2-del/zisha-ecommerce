"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";

interface LuckyDrawItem {
  id: number;
  product_id: number;
  product_name: string;
  product_image: string;
  product_price: number;
  total_equity: number;
  current_equity: number;
  price_per_equity: number;
  start_time: string;
  end_time: string;
  status: string;
}

export function LuckyDraw() {
  const { t } = useTranslation();
  const [luckyDraws, setLuckyDraws] = useState<LuckyDrawItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLuckyDraws();
  }, []);

  const fetchLuckyDraws = async () => {
    try {
      const response = await fetch("/api/lucky-draws");
      const data = await response.json();
      setLuckyDraws(data.luckyDraws || []);
    } catch (error) {
      console.error("Error fetching lucky draws:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressPercentage = (current: number, total: number) => {
    return Math.round((current / total) * 100);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "进行中";
      case "completed":
        return "已结束";
      case "cancelled":
        return "已取消";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "completed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amazon-orange"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            一元购抽奖
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            参与一元购抽奖，只需1元就有机会赢取精美紫砂壶！
          </p>
        </div>

        {luckyDraws.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 text-lg">
              暂无进行中的一元购活动
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {luckyDraws.map((draw) => (
              <div
                key={draw.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={draw.product_image}
                    alt={draw.product_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(draw.status)}`}>
                      {getStatusText(draw.status)}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                    {draw.product_name}
                  </h3>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-amazon-orange">
                      ¥{draw.price_per_equity}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      总{draw.total_equity}份
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        进度
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {draw.current_equity}/{draw.total_equity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-amazon-orange h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage(draw.current_equity, draw.total_equity)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Link
                      href={`/lucky-draw/${draw.id}`}
                      className="flex-1 bg-amazon-orange hover:bg-amazon-light-orange text-white text-sm font-medium py-2 px-4 rounded transition-colors duration-200 text-center"
                    >
                      查看详情
                    </Link>
                    {draw.status === "active" && (
                      <Link
                        href={`/lucky-draw/${draw.id}/buy`}
                        className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium py-2 px-4 rounded transition-colors duration-200 text-center"
                      >
                        参与购买
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/lucky-draws"
            className="inline-flex items-center text-amazon-orange hover:text-amazon-light-orange font-medium transition-colors duration-200"
          >
            查看所有一元购活动
            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
