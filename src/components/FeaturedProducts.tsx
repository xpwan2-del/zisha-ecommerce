"use client";

import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";
import { Pagination } from "./Pagination";
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCart } from '@/lib/contexts/CartContext';
import { convertCurrency, formatCurrency } from '@/lib/utils/currency';

interface HomeData {
  modules: any[];
  guarantees: any[];
  categories: any[];
  products: any[];
  pagination?: {
    total: number;
    totalPages: number;
    total_pages: number;
    page: number;
    pageSize: number;
  };
}

interface FeaturedProductsProps {
  category?: string;
  data?: HomeData;
  pageType?: 'products' | 'deals';
}

export function FeaturedProducts({ category = "all", data, pageType = "products" }: FeaturedProductsProps) {
  const { currency } = useCurrency();
  const { user, isAuthenticated } = useAuth();
  const { refreshCart } = useCart();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const productsPerPage = 12;

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
  }, [category, data, currentPage, pageType]);

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
          // 直接使用API返回的总页数（API返回total_pages）
          setTotalPages(pagination.total_pages || pagination.totalPages || 1);
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
            image: product.image || product.main_image, // Use image or main_image
            activities: product.activities && product.activities.length > 0 ? product.activities.map((act: any) => ({
              id: act.id,
              name: act.name || act.name_en || act.name_ar,
              icon: act.icon_url || act.icon || 'tag',
              color: act.color || 'var(--accent)'
            })) : (product.activity_tag ? [{
              id: product.id,
              name: product.activity_tag,
              icon: product.activity_icon || 'tag',
              color: product.activity_color || 'var(--accent)'
            }] : [])
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
        const apiEndpoint = pageType === 'deals' 
          ? `/api/products/deals?page=${currentPage}&limit=12`
          : `/api/products?category_id=${category}&page=${currentPage}&limit=12`;
        const response = await fetch(apiEndpoint);
        const apiData = await response.json();
        
        if (apiData.success && apiData.data && apiData.data.products) {
          const products = apiData.data.products;
          const pagination = apiData.data.pagination || {};
          
          // 处理产品数据，确保数据结构正确
          const processedProducts = products.map((product: any) => ({
            ...product,
            originalPrice: product.original_price || product.originalPrice,
            rating: parseFloat(product.rating) || 4.5,
            reviewCount: product.review_count || product.reviewCount || 0,
            category: product.category_id || product.category,
            inStock: product.stock > 0,
            stock_status_id: product.stock_status_id || 1,
            stock_status_info: product.stock_status_info || null,
            fastDelivery: true, // Default fast delivery
            image: product.image || product.main_image, // Use image or main_image
          }));
          
          setProducts(processedProducts);
          setTotalPages(pagination.total_pages || 1);
          // 不重置currentPage，因为我们是根据currentPage获取数据的
        } else {
          // Use default products if API returns non-array
          console.warn('API returned non-array data, using default products');
          const filteredProducts = filterProductsByCategory(defaultProducts, category);
          setProducts(filteredProducts);
          setTotalPages(Math.ceil(filteredProducts.length / productsPerPage));
        }
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setError('Failed to load products, using default data');
      // Use default products on error
      const filteredProducts = filterProductsByCategory(defaultProducts, category);
      setAllProducts(filteredProducts);
      setTotalPages(Math.ceil(filteredProducts.length / productsPerPage));
    } finally {
      setIsLoading(false);
    }
  };

  const filterProductsByCategory = (productList: any[], cat: string) => {
    if (cat === "all") return productList;
    
    // 处理deals页面的筛选
    if (pageType === 'deals') {
      if (cat === "flash_sale") return productList.filter(p => p.deal_type === "flash_sale");
      if (cat === "daily_deals") return productList.filter(p => p.deal_type === "daily_deals");
      return productList;
    }
    
    // 处理普通商品页面的分类筛选
    return productList.filter(product => {
      if (typeof product.category === 'object' && product.category.id) {
        return product.category.id.toString() === cat;
      }
      return product.category === cat;
    });
  };

  // 分类活动标签 - 计算所有促销的总折扣
  const getDiscountBadges = (product: any) => {
    const badges = [];
    const promos = product.promotions || [];

    if (promos.length > 0) {
      // 检查是否有独占促销（can_stack=1）
      const exclusive = promos.find((p: any) => p.can_stack === 1);
      let totalDiscount;
      let formula = '';

      if (exclusive) {
        // 有独占促销，只用priority最小的（优先级最高）的那个
        // 按priority排序，选择最小的
        const sortedExclusives = promos.filter((p: any) => p.can_stack === 1).sort((a: any, b: any) => a.priority - b.priority);
        const topExclusive = sortedExclusives[0];
        totalDiscount = topExclusive.discount_percent;
        formula = `${topExclusive.discount_percent}%`;
      } else {
        // 可叠加促销，计算总体折扣
        // 公式：1 - (1-d1/100) × (1-d2/100) × (1-d3/100)...
        let multiplier = 1;
        const parts: string[] = [];
        promos.forEach((p: any) => {
          multiplier *= (1 - p.discount_percent / 100);
          parts.push(`(1-${p.discount_percent}%)`);
        });
        totalDiscount = Math.round((1 - multiplier) * 100);
        formula = parts.join(' × ') + ` = ${totalDiscount}%`;
      }

      badges.push({
        type: 'discount',
        text: `最终折扣 ${totalDiscount}% OFF SALE`,
        color: '#EF4444' // 固定红色
      });
    }

    return badges;
  };

  // 分类状态标签
  const getStatusBadges = (product: any) => {
    const badges = [];
    if (product.isNew) {
      badges.push({
        type: 'new',
        text: '新品',
        color: 'var(--color-green)'
      });
    }
    // 根据库存状态显示标签
    if (product.stock_status_info) {
      const statusId = product.stock_status_info.id;
      const statusName = product.stock_status_info.name;
      if (statusId === 4) {
        badges.push({
          type: 'outOfStock',
          text: statusName,
          color: product.stock_status_info.color
        });
      } else if (statusId === 2 || statusId === 3) {
        badges.push({
          type: 'limited',
          text: statusName,
          color: product.stock_status_info.color
        });
      }
    } else if (product.stock <= 0) {
      badges.push({
        type: 'outOfStock',
        text: '缺货',
        color: 'var(--color-red)'
      });
    } else if (product.stock < 10 && product.stock > 0) {
      badges.push({
        type: 'limited',
        text: '库存有限',
        color: 'var(--color-orange)'
      });
    }
    return badges;
  };

  // 获取普通活动标签
  const getActivityTags = (product: any) => {
    const tags = [];
    const addedNames = new Set();
    
    // 处理activities数组（来自activity_categories）
    if (product.activities && Array.isArray(product.activities)) {
      product.activities.forEach((act: any) => {
        if (act.name && !addedNames.has(act.name)) {
          tags.push({
            id: act.id || product.id,
            name: act.name || act.name_en || act.name_ar || '活动',
            icon: act.icon_url || act.icon || 'tag',
            color: act.color || 'var(--accent)'
          });
          addedNames.add(act.name);
        }
      });
    }
    
    // 处理promotion字段（单个活动）
    if (product.promotion && typeof product.promotion === 'object') {
      if (!['今日特惠', '特惠商品'].includes(product.promotion.name)) {
        tags.push({
          id: product.promotion.id || product.id,
          name: product.promotion.name || '活动',
          icon: product.promotion.icon || 'tag',
          color: product.promotion.color || 'var(--accent)'
        });
        addedNames.add(product.promotion.name);
      }
    }
    
    // 处理promotions字段（多个活动数组）
    if (product.promotions && Array.isArray(product.promotions)) {
      product.promotions.forEach((promo: any) => {
        if (promo.name && !addedNames.has(promo.name) && !['今日特惠', '特惠商品'].includes(promo.name)) {
          tags.push({
            id: promo.id || product.id,
            name: promo.name || '活动',
            icon: promo.icon || 'tag',
            color: promo.color || 'var(--color-red)'
          });
          addedNames.add(promo.name);
        }
      });
    }
    
    // 处理activity_tag字段（单独标签）
    if (product.activity_tag && !tags.find((t: any) => t.name === product.activity_tag)) {
      tags.push({
        id: product.id,
        name: product.activity_tag,
        icon: product.activity_icon || 'tag',
        color: product.activity_color || (product.activity_tag === '今日特惠' ? 'var(--color-red)' : 'var(--accent)')
      });
    }
    
    return tags;
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

  const refreshInventoryStatus = async (productId: number) => {
    try {
      const response = await fetch(`/api/inventory/status?ids=${productId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          const statusData = data.data[0];
          setProducts(prev => prev.map(p =>
            p.id === productId
              ? {
                  ...p,
                  stock: statusData.stock,
                  stock_status_id: statusData.stock_status_id,
                  stock_status_info: statusData.stock_status_info
                }
              : p
          ));
        }
      }
    } catch (error) {
      console.error('Failed to refresh inventory status:', error);
    }
  };

  const handleAddToCart = async (product: any) => {
    if (!product) return;
    
    try {
      if (isAuthenticated && user) {
        const accessToken = localStorage.getItem('access_token');
        const response = await fetch('/api/cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            product_id: product.id,
            quantity: 1
          })
        });
        
        if (response.ok) {
          alert('已添加到购物车');
          await refreshCart();
          await refreshInventoryStatus(product.id);
        } else {
          alert('添加失败');
        }
      } else {
        const guestCart = JSON.parse(localStorage.getItem('cart_guest') || '[]');
        const existingIndex = guestCart.findIndex((item: any) => item.id === product.id);
        
        if (existingIndex >= 0) {
          guestCart[existingIndex].quantity += 1;
        } else {
          guestCart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
          });
        }
        
        localStorage.setItem('cart_guest', JSON.stringify(guestCart));
        alert('已添加到购物车（未登录）');
        await refreshInventoryStatus(product.id);
      }
    } catch (error) {
      console.error('添加购物车失败:', error);
      alert('添加失败');
    }
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
    <section className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
            {Array.from({ length: 12 }).map((_, index) => (
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
                <div key={product.id} className="bg-white rounded-md border overflow-hidden hover:shadow-md transition-shadow" style={{ borderColor: 'var(--border)' }}>
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

                  <div className="p-4 flex flex-col flex-1">
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
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[var(--accent)]/20 rounded-md shadow-sm hover:shadow-md transition-all duration-300"
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
                        <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                          {product.promotion && product.promotion.promotion_price
                            ? formatCurrency(product.promotion.promotion_price, currency)
                            : formatCurrency(product.price, currency)}
                        </span>
                        {product.promotion && product.promotion.discount_percent > 0 && (
                          <span className="text-sm text-gray-500 line-through ml-2">
                            {formatCurrency(product.price, currency)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center text-xs text-gray-500 mb-3 min-h-[20px]">
                      {product.stock_status_info ? (
                        <span
                          className="mr-2 font-medium"
                          style={{ color: product.stock_status_info.color }}
                        >
                          {product.stock_status_info.name}
                        </span>
                      ) : product.inStock ? (
                        <span className="text-green-600 mr-2">有货</span>
                      ) : (
                        <span className="text-red-600 mr-2">缺货</span>
                      )}
                      {product.fastDelivery && (
                        <span className="mr-2">快速配送</span>
                      )}
                    </div>

                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => router.push(`/products/${product.id}`)}
                        className="flex-1 text-center py-2 rounded-md text-sm font-medium transition-all duration-300 hover:opacity-90"
                        style={{
                          backgroundColor: 'var(--btn-secondary-bg)',
                          color: 'var(--btn-secondary-text)',
                          border: '1px solid var(--btn-secondary-border)'
                        }}
                      >
                        查看详情
                      </button>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="flex-1 text-center py-2 rounded-md text-sm font-medium transition-all duration-300 hover:opacity-90"
                        style={{
                          backgroundColor: 'var(--btn-primary-bg)',
                          color: 'var(--btn-primary-text)',
                          border: '1px solid var(--btn-primary-border)'
                        }}
                      >
                        加入购物车
                      </button>
                    </div>
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
