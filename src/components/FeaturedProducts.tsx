"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Pagination } from "./Pagination";
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { convertCurrency, formatCurrency } from '@/lib/utils/currency';

interface HomeData {
  modules: any[];
  guarantees: any[];
  categories: any[];
  products: any[];
}

interface FeaturedProductsProps {
  category?: string;
  data?: HomeData;
}

export function FeaturedProducts({ category = "all", data }: FeaturedProductsProps) {
  const { currency } = useCurrency();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const productsPerPage = 9;

  // 模拟产品数据
  const defaultProducts = [
    {
      id: 1,
      name: "经典石瓢壶 - 宜兴紫砂壶手工制作",
      description: "传统工艺，手工制作，优质紫砂泥料",
      price: 899,
      originalPrice: 1299,
      discount: 30,
      image: "https://image.pollinations.ai/prompt/yixing%20zisha%20teapot%20stone%20gourd%20shape%20traditional%20chinese%20tea%20pot%20high%20quality%20professional%20photography%20white%20background?width=400&height=400&seed=1",
      category: "1",
      rating: 4.8,
      reviewCount: 128,
      inStock: true,
      fastDelivery: true,
      bestSeller: true,
    },
    {
      id: 2,
      name: "西施壶 - 精品紫砂壶茶具套装",
      price: 699,
      originalPrice: 999,
      discount: 30,
      image: "https://image.pollinations.ai/prompt/yixing%20zisha%20teapot%20xishi%20shape%20elegant%20design%20traditional%20chinese%20tea%20pot%20high%20quality%20professional%20photography%20white%20background?width=400&height=400&seed=2",
      category: "1",
      rating: 4.7,
      reviewCount: 89,
      inStock: true,
      fastDelivery: true,
    },
    {
      id: 3,
      name: "精美茶杯 - 紫砂品茗杯套装",
      price: 299,
      originalPrice: 499,
      discount: 40,
      image: "https://image.pollinations.ai/prompt/zisha%20tea%20cups%20set%20traditional%20chinese%20tea%20cups%20elegant%20design%20high%20quality%20professional%20photography%20white%20background?width=400&height=400&seed=3",
      category: "2",
      rating: 4.9,
      reviewCount: 210,
      inStock: true,
      bestSeller: true,
    },
    {
      id: 4,
      name: "茶叶罐 - 密封存储罐",
      price: 199,
      originalPrice: 299,
      discount: 33,
      image: "https://image.pollinations.ai/prompt/zisha%20tea%20caddy%20traditional%20chinese%20tea%20storage%20jar%20sealed%20high%20quality%20professional%20photography%20white%20background?width=400&height=400&seed=4",
      category: "3",
      rating: 4.6,
      reviewCount: 76,
      inStock: true,
    },
  ];

  useEffect(() => {
    fetchProducts();
  }, [category, data]);

  // Handle pagination
  useEffect(() => {
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    setProducts(allProducts.slice(startIndex, endIndex));
  }, [currentPage, allProducts, productsPerPage]);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // First check if data is provided via props
      if (data) {
        // 处理来自 /api/products API 的数据结构（直接传递data字段）
        if (data.products && data.pagination) {
          console.log('Received data from /api/products:', data.products.length, 'products');
          console.log('First product:', data.products[0]);
          console.log('Pagination data:', data.pagination);
          console.log('Total pages from API:', data.pagination.total_pages);
          
          // 直接使用API返回的数据
          const products = data.products;
          const pagination = data.pagination || {};
          
          const filteredProducts = filterProductsByCategory(products, category);
          setAllProducts(filteredProducts);
          // 直接使用API返回的总页数
          setTotalPages(pagination.total_pages || 1);
          setCurrentPage(1); // Reset to first page
        }
        // 处理来自 /api/home API 的数据结构
        else if (data.products && Array.isArray(data.products)) {
          console.log('Received data via props:', data.products.length, 'products');
          console.log('First product in props:', data.products[0]);
          // Convert API data to match component expected format
          const formattedProducts = data.products.map((product: any) => ({
            ...product,
            originalPrice: product.original_price,
            rating: 4.5, // Default rating
            reviewCount: 50, // Default review count
            category: product.category_id,
            inStock: product.stock > 0,
            fastDelivery: true, // Default fast delivery
            bestSeller: product.id <= 2, // Mark first 2 products as best sellers
            image: product.image || product.main_image, // Use image or main_image
            activities: product.activity_tag ? [{
              id: product.id,
              name: product.activity_tag,
              icon: product.activity_icon || 'tag',
              color: product.activity_tag === '今日特惠' ? '#EF4444' : product.activity_tag === '特惠产品' ? '#3B82F6' : '#8B5CF6'
            }] : [] // Include activity data
          }));
          console.log('Formatted products:', formattedProducts.length, 'products');
          console.log('First formatted product:', formattedProducts[0]);
          const filteredProducts = filterProductsByCategory(formattedProducts, category);
          setAllProducts(filteredProducts);
          setTotalPages(Math.ceil(filteredProducts.length / productsPerPage));
          setCurrentPage(1); // Reset to first page
        }
      } else {
        // Fetch from API if no data provided
        const response = await fetch(`/api/products?category=${category}`);
        const apiData = await response.json();
        
        if (apiData.success && apiData.data && apiData.data.products) {
          const products = apiData.data.products;
          const pagination = apiData.data.pagination || {};
          
          const filteredProducts = filterProductsByCategory(products, category);
          setAllProducts(filteredProducts);
          setTotalPages(pagination.total_pages || Math.ceil(filteredProducts.length / productsPerPage));
          setCurrentPage(1); // Reset to first page
        } else {
          // Use default products if API returns non-array
          console.warn('API returned non-array data, using default products');
          const filteredProducts = filterProductsByCategory(defaultProducts, category);
          setAllProducts(filteredProducts);
          setTotalPages(Math.ceil(filteredProducts.length / productsPerPage));
          setCurrentPage(1); // Reset to first page
        }
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setError('Failed to load products, using default data');
      // Use default products on error
      const filteredProducts = filterProductsByCategory(defaultProducts, category);
      setAllProducts(filteredProducts);
      setTotalPages(Math.ceil(filteredProducts.length / productsPerPage));
      setCurrentPage(1); // Reset to first page
    } finally {
      setIsLoading(false);
    }
  };

  const filterProductsByCategory = (productList: any[], cat: string) => {
    if (cat === "all") return productList;
    return productList.filter(product => {
      // 处理不同的数据结构
      if (typeof product.category === 'object' && product.category.id) {
        return product.category.id.toString() === cat;
      }
      return product.category === cat;
    });
  };

  // 分类活动标签
  const getDiscountBadges = (product: any) => {
    const badges = [];
    if (product.discount > 0) {
      badges.push({
        type: 'discount',
        text: `特惠 ${product.discount}%`,
        color: '#EF4444'
      });
    }
    if (product.daily_discount > 0) {
      badges.push({
        type: 'daily',
        text: `今日特惠 ${product.daily_discount}%`,
        color: '#F59E0B'
      });
    }
    if (product.discount > 0 || product.daily_discount > 0) {
      const totalDiscount = (product.discount || 0) + (product.daily_discount || 0);
      badges.push({
        type: 'total',
        text: `总特惠 ${totalDiscount}%`,
        color: '#8B5CF6'
      });
    }
    return badges;
  };

  // 分类状态标签
  const getStatusBadges = (product: any) => {
    const badges = [];
    if (product.bestSeller) {
      badges.push({
        type: 'bestSeller',
        text: '畅销',
        color: '#CA8A04'
      });
    }
    if (product.new) {
      badges.push({
        type: 'new',
        text: '新品',
        color: '#10B981'
      });
    }
    if (product.stock < 10 && product.stock > 0) {
      badges.push({
        type: 'limited',
        text: '库存有限',
        color: '#6366F1'
      });
    }
    return badges;
  };

  // 获取普通活动标签
  const getActivityTags = (product: any) => {
    // 处理不同的数据结构
    if (product.activities && Array.isArray(product.activities)) {
      return product.activities.filter((activity: any) => 
        !['今日特惠', '特惠产品'].includes(activity.name)
      ).map((activity: any) => ({
        ...activity,
        color: activity.color || '#8B5CF6', // 确保每个活动都有一个颜色属性
        icon: activity.icon || activity.icon_url || 'tag' // 确保每个活动都有一个图标属性
      }));
    }
    // 处理单独的活动标签字段
    else if (product.activity_tag) {
      return [{
        id: product.id,
        name: product.activity_tag,
        icon: product.activity_icon || product.icon_url || 'tag',
        color: product.activity_tag === '今日特惠' ? '#EF4444' : product.activity_tag === '特惠产品' ? '#3B82F6' : '#8B5CF6'
      }];
    }
    return [];
  };

  const getStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? "text-yellow-400" : "text-gray-300"}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  // Get activity icon
  const getActivityIcon = (icon: any) => {
    // 直接返回默认图标，不处理任何逻辑
    return (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8 font-['Noto_Naskh_Arabic'] text-[#831843]">热门产品</h2>
        
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const discountBadges = getDiscountBadges(product);
              const statusBadges = getStatusBadges(product);
              const activityTags = getActivityTags(product);
              
              return (
                <div key={product.id} className="bg-white rounded-md shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="lazy"
                    />
                    
                    {/* 折扣标签 - 左上角 */}
                    <div className="absolute top-1 left-1 flex flex-col gap-1.5">
                      {discountBadges.slice(0, 3).map((badge, index) => (
                        <div 
                          key={`discount-${badge.type}`}
                          className="px-2 py-1 rounded-md shadow-md font-bold text-white text-[10px] sm:text-xs"
                          style={{
                            background: `linear-gradient(135deg, ${badge.color}, ${badge.color}99)`,
                            boxShadow: `0 2px 4px rgba(0,0,0,0.2)`
                          }}
                        >
                          {badge.text}
                        </div>
                      ))}
                    </div>
                    
                    {/* 状态标签 - 右下角 */}
                    <div className="absolute bottom-1 right-1 flex flex-col gap-1.5">
                      {statusBadges.slice(0, 2).map((badge) => (
                        <div 
                          key={`status-${badge.type}`}
                          className="px-2 py-1 rounded-md shadow-md font-bold text-white text-[10px] sm:text-xs"
                          style={{
                            background: badge.color,
                            boxShadow: `0 2px 4px rgba(0,0,0,0.2)`
                          }}
                        >
                          {badge.text}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center mb-2">
                      {getStars(product.rating)}
                      <span className="text-xs text-gray-500 ml-1">
                        ({product.reviewCount})
                      </span>
                    </div>

                    <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                      {product.name}
                    </h3>

                    {/* 普通活动标签 - 商品名称下方 */}
                    {activityTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {activityTags.slice(0, 4).map((activity: any) => (
                          <div
                            key={activity.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#DB2777]/20 rounded-md shadow-sm hover:shadow-md transition-all duration-300"
                            style={{ 
                              background: `linear-gradient(135deg, ${activity.color}20, ${activity.color}10)`,
                              borderColor: `${activity.color}40`
                            }}
                          >
                            {getActivityIcon(activity.icon)}
                            <span className="text-xs font-medium" style={{ color: activity.color }}>
                              {activity.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mb-3">
                      <div className="flex items-baseline">
                        <span className="text-lg font-bold text-amazon-orange">
                          {formatCurrency(convertCurrency(product.price, 'CNY', currency), currency)}
                        </span>
                        {product.originalPrice > 0 && (
                          <span className="text-sm text-gray-500 line-through ml-2">
                            {formatCurrency(convertCurrency(product.originalPrice, 'CNY', currency), currency)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center text-xs text-gray-500 mb-3">
                      {product.inStock && (
                        <span className="text-green-600 mr-2">有货</span>
                      )}
                      {product.fastDelivery && (
                        <span className="mr-2">快速配送</span>
                      )}
                    </div>

                    <Link
                      href={`/products/${product.id}`}
                      className="block w-full bg-amazon-orange hover:bg-amazon-light-orange text-white text-sm font-medium py-2 px-4 rounded transition-colors duration-200 text-center hover:shadow-md"
                    >
                      查看详情
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </section>
  );
}
