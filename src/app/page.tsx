"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Footer } from "@/components/Footer";
import { LuckyDraw } from "@/components/LuckyDraw";

interface ModuleConfig {
  module_hero: boolean;
  module_categories: boolean;
  module_featured_products: boolean;
  module_about: boolean;
  module_testimonials: boolean;
  module_contact: boolean;
  module_customize: boolean;
  module_lucky_draw: boolean;
}

function ProductImageCarousel({ product }: { product: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = product.images && product.images.length > 0 
    ? product.images 
    : [product.image || "https://placehold.co/400x400/e8d4c4/ffffff?text=Zisha+Product"];

  useEffect(() => {
    if (images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="aspect-square relative overflow-hidden bg-gray-100">
      <a href={`/products/${product.id}`} className="block w-full h-full">
        <img
          src={images[currentIndex] || product.image}
          alt={`${product.name || product.name_en || "Product"}`}
          className="w-full h-full object-cover"
        />
      </a>
      
      {product.discount > 0 && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-red-500 text-white text-sm font-bold px-2 py-1 rounded">
            -{product.discount}%
          </span>
        </div>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
          {images.map((_: string, index: number) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-amazon-orange w-4' : 'bg-white bg-opacity-70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const [configs, setConfigs] = useState<ModuleConfig>({
    module_hero: true,
    module_categories: true,
    module_featured_products: true,
    module_about: true,
    module_testimonials: true,
    module_contact: true,
    module_customize: false,
    module_lucky_draw: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [products, setProducts] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    fetchConfigs();
    fetchProducts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchProducts();
  }, [activeCategory]);

  useEffect(() => {
    fetchProducts();
  }, [currentPage]);

  const fetchConfigs = async () => {
    try {
      const response = await fetch("/api/system-configs");
      const data = await response.json();
      setConfigs(data);
    } catch (error) {
      console.error("Error fetching configs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/products?category=${activeCategory}&page=${currentPage}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setProducts(data);
        setTotalPages(1);
        setTotalProducts(data.length);
      } else if (data.products && Array.isArray(data.products)) {
        setProducts(data.products);
        setTotalPages(data.totalPages || 1);
        setTotalProducts(data.total || data.products.length);
      } else {
        setProducts([]);
        setTotalPages(1);
        setTotalProducts(0);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
      setTotalPages(1);
      setTotalProducts(0);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amazon-orange"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 左侧分类筛选 */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-md shadow-sm p-4 mb-6">
              <h3 className="text-lg font-semibold mb-4">{t("categories.title", "分类")}</h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => setActiveCategory("all")}
                    className={`w-full text-left px-3 py-2 rounded-md ${activeCategory === "all" ? "bg-amazon-orange text-white" : "hover:bg-gray-100"}`}
                  >
                    {t("products.all", "全部商品")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveCategory("1")}
                    className={`w-full text-left px-3 py-2 rounded-md ${activeCategory === "1" ? "bg-amazon-orange text-white" : "hover:bg-gray-100"}`}
                  >
                    {t("categories.items.0", "紫砂壶")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveCategory("2")}
                    className={`w-full text-left px-3 py-2 rounded-md ${activeCategory === "2" ? "bg-amazon-orange text-white" : "hover:bg-gray-100"}`}
                  >
                    {t("categories.items.1", "茶杯")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveCategory("3")}
                    className={`w-full text-left px-3 py-2 rounded-md ${activeCategory === "3" ? "bg-amazon-orange text-white" : "hover:bg-gray-100"}`}
                  >
                    {t("categories.items.2", "配件")}
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* 右侧产品展示 */}
          <div className="lg:w-3/4">
            <h2 className="text-2xl font-bold mb-6">{t("nav.deals", "今日特惠")}</h2>
            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="bg-white rounded-md shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <ProductImageCarousel product={product} />

                    <div className="p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                        {i18n.language === "zh" 
                          ? product.name 
                          : i18n.language === "ar" 
                            ? product.name_ar 
                            : product.name_en 
                            || product.name 
                            || "Product"}
                      </h3>

                      <div className="mb-3">
                        <div className="flex items-baseline">
                          <span className="text-lg font-bold text-amazon-orange">
                            ¥{product.price}
                          </span>
                          {product.original_price && (
                            <span className="text-sm text-gray-500 line-through ml-2">
                              ¥{product.original_price}
                            </span>
                          )}
                        </div>
                      </div>

                      <a
                        href={`/products/${product.id}`}
                        className="block w-full bg-amazon-orange hover:bg-amazon-light-orange text-white text-sm font-medium py-2 px-4 rounded transition-colors duration-200 text-center"
                      >
                        {t("products.view", "查看详情")}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-md shadow-sm p-6 text-center">
                <p className="text-gray-600">{t("products.no_products", "暂无产品数据")}</p>
              </div>
            )}

            {/* 分页组件 */}
            {totalPages > 1 && (
              <div className="mt-8 bg-white rounded-md shadow-sm p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    {t("products.page_info", "共 {{total}} 个产品，当前第 {{currentPage}} 页，共 {{totalPages}} 页", { total: totalProducts, currentPage: currentPage, totalPages: totalPages })}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* 上一页按钮 */}
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {t("products.prev", "上一页")}
                    </button>

                    {/* 页码按钮 */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-10 h-10 rounded-md text-sm font-medium ${
                              currentPage === pageNum
                                ? 'bg-amazon-orange text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* 下一页按钮 */}
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {t("products.next", "下一页")}
                    </button>

                    {/* 跳转到指定页 */}
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm text-gray-600">{t("pagination.total_pages", "跳转到")}</span>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value);
                          if (page >= 1 && page <= totalPages) {
                            setCurrentPage(page);
                          }
                        }}
                        className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm text-center"
                      />
                      <span className="text-sm text-gray-600">{t("pagination.total_pages", "页")}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 其他模块 */}
      {configs.module_lucky_draw && <LuckyDraw />}
      
      <Footer />
    </div>
  );
}
