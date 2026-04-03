"use client";

import { useState } from "react";

export function DealsNavigation({ activeCategory, onCategoryChange }: any) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const dealCategories = [
    { id: "lightning", name: "限时特惠" },
    { id: "most-loved", name: "最受欢迎" },
    { id: "outlet", name: "清仓折扣" },
    { id: "lowest-price", name: "年度最低价" },
    { id: "teapots", name: "紫砂壶" },
    { id: "cups", name: "茶杯" },
    { id: "caddies", name: "茶叶罐" },
  ];

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center text-gray-700 hover:text-amazon-orange"
            >
              <span className="mr-2">☰</span>
              全部分类
            </button>
            <div className="hidden md:flex items-center space-x-1 overflow-x-auto whitespace-nowrap">
              {dealCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => onCategoryChange(category.id)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    activeCategory === category.id
                      ? "text-amazon-orange border-b-2 border-amazon-orange"
                      : "text-gray-600 hover:text-amazon-orange"
                  }`}
                >
                  {category.name}
                </button>
              ))}
              <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-amazon-orange">
                更多 ›
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              每日更新特惠商品
            </div>
          </div>
        </div>
      </div>

      {/* 移动端菜单 */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col space-y-1">
              {dealCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    onCategoryChange(category.id);
                    setIsMenuOpen(false);
                  }}
                  className={`px-4 py-2 text-sm font-medium text-left ${
                    activeCategory === category.id
                      ? "text-amazon-orange bg-amazon-orange/10"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
