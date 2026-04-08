"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Pagination } from "./Pagination";

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
      if (data && data.products && Array.isArray(data.products)) {
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
      } else {
        // Fetch from API if no data provided
        const response = await fetch(`/api/products?category=${category}`);
        const apiData = await response.json();
        
        // Check if data is an array or has products property
        if (Array.isArray(apiData)) {
          // Convert API data to match component expected format
          const formattedProducts = apiData.map((product: any) => ({
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
          setAllProducts(formattedProducts);
          setTotalPages(Math.ceil(formattedProducts.length / productsPerPage));
          setCurrentPage(1); // Reset to first page
        } else if (apiData.products && Array.isArray(apiData.products)) {
          // Convert API data to match component expected format
          const formattedProducts = apiData.products.map((product: any) => ({
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
          const filteredProducts = filterProductsByCategory(formattedProducts, category);
          setAllProducts(filteredProducts);
          setTotalPages(Math.ceil(filteredProducts.length / productsPerPage));
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
    return productList.filter(product => product.category === cat);
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
  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'fire':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.596 2.184a1 1 0 00-.196 1.094c.21.568.544 1.042.917 1.356C10.97 5.093 11 5.514 11 6v6a2 2 0 11-4 0V6c0-.486.03-.907.133-1.351a4.5 4.5 0 01.917-1.355 1 1 0 00-.196-1.094 6 6 0 10-7.586 7.586A1 1 0 108 14h8a1 1 0 000-2h-2.5a1 1 0 000 2h-5a1 1 0 01-1-1v-5a1 1 0 011-1h4.5a1 1 0 00.196-1.906z" />
          </svg>
        );
      case 'star':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case 'trophy':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 13.5c0 .83.67 1.5 1.5 1.5h3c.83 0 1.5-.67 1.5-1.5v-8c0-.83-.67-1.5-1.5-1.5h-3c-.83 0-1.5.67-1.5 1.5v8zM9 8V5h2v3H9z" />
            <path d="M4 4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm10 12H6v-3h8v3z" />
          </svg>
        );
      case 'crown':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a2.5 2.5 0 014.9 0H17a1 1 0 001-1V5a1 1 0 00-1-1H3z" />
            <path d="M11 8.5a1 1 0 011-1h3a1 1 0 110 2h-3a1 1 0 01-1-1z" />
          </svg>
        );
      case 'alert-circle':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      case 'truck':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zM13 10a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM9 16a1 1 0 100-2h2a1 1 0 100 2H9z" clipRule="evenodd" />
            <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5z" />
          </svg>
        );
      case 'gift':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm4 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            <path d="M12 7a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'leaf':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        );
      case 'user':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
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
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-md shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square relative">
                  {console.log('Rendering product:', product.id, 'image:', product.image)}
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {product.discount > 0 && (
                    <div className="absolute top-1 left-1">
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        特惠 {product.discount}%
                      </span>
                    </div>
                  )}
                  {product.daily_discount > 0 && (
                    <div className="absolute top-6 left-1">
                      <span className="bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        今日特惠 {product.daily_discount}%
                      </span>
                    </div>
                  )}
                  {(product.discount > 0 || product.daily_discount > 0) && (
                    <div className="absolute top-11 left-1">
                      <span className="bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        总特惠 {product.discount + (product.daily_discount || 0)}%
                      </span>
                    </div>
                  )}
                  {product.bestSeller && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-amazon-orange text-white text-xs font-bold px-2 py-1 rounded">
                        畅销
                      </span>
                    </div>
                  )}
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

                  <div className="mb-3">
                    <div className="flex items-baseline">
                      <span className="text-lg font-bold text-amazon-orange">
                        ¥{product.price}
                      </span>
                      {product.originalPrice > 0 && (
                        <span className="text-sm text-gray-500 line-through ml-2">
                          ¥{product.originalPrice}
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

                  {/* Activity labels */}
                  {product.activities && product.activities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {product.activities.map((activity: any) => (
                        <div
                          key={activity.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#DB2777]/20 rounded-md shadow-sm hover:shadow-md transition-all duration-300"
                          style={{ background: `linear-gradient(135deg, ${activity.color}20, ${activity.color}10)` }}
                        >
                          {getActivityIcon(activity.icon)}
                          <span className="text-xs font-medium" style={{ color: activity.color }}>
                            {activity.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link
                    href={`/products/${product.id}`}
                    className="block w-full bg-amazon-orange hover:bg-amazon-light-orange text-white text-sm font-medium py-2 px-4 rounded transition-colors duration-200 text-center"
                  >
                    查看详情
                  </Link>
                </div>
              </div>
            ))}
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
