"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface FeaturedProductsProps {
  category?: string;
}

export function FeaturedProducts({ category = "all" }: FeaturedProductsProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 模拟产品数据
  const defaultProducts = [
    {
      id: 1,
      name: "经典石瓢壶 - 宜兴紫砂壶手工制作",
      description: "传统工艺，手工制作，优质紫砂泥料",
      price: 899,
      originalPrice: 1299,
      discount: 30,
      image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Yixing%20zisha%20teapot%20stone%20gourd%20shape%2C%20traditional%20Chinese%20tea%20pot%2C%20high%20quality%2C%20professional%20photography%2C%20white%20background&image_size=square_hd",
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
      image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Yixing%20zisha%20teapot%20Xishi%20shape%2C%20elegant%20design%2C%20traditional%20Chinese%20tea%20pot%2C%20high%20quality%2C%20professional%20photography%2C%20white%20background&image_size=square_hd",
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
      image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Zisha%20tea%20cups%20set%2C%20traditional%20Chinese%20tea%20cups%2C%20elegant%20design%2C%20high%20quality%2C%20professional%20photography%2C%20white%20background&image_size=square_hd",
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
      image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Zisha%20tea%20caddy%2C%20traditional%20Chinese%20tea%20storage%20jar%2C%20sealed%2C%20high%20quality%2C%20professional%20photography%2C%20white%20background&image_size=square_hd",
      category: "3",
      rating: 4.6,
      reviewCount: 76,
      inStock: true,
    },
  ];

  useEffect(() => {
    fetchProducts();
  }, [category]);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products?category=${category}`);
      const data = await response.json();
      
      // Check if data is an array or has products property
      if (Array.isArray(data)) {
        setProducts(data);
      } else if (data.products && Array.isArray(data.products)) {
        // Convert API data to match component expected format
        const formattedProducts = data.products.map((product: any) => ({
          ...product,
          originalPrice: product.original_price,
          rating: 4.5, // Default rating
          reviewCount: 50, // Default review count
          category: product.category_id,
          inStock: product.stock > 0,
          fastDelivery: true, // Default fast delivery
          bestSeller: product.id <= 2 // Mark first 2 products as best sellers
        }));
        setProducts(formattedProducts);
      } else {
        // Use default products if API returns non-array
        console.warn('API returned non-array data, using default products');
        setProducts(filterProductsByCategory(defaultProducts, category));
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setError('Failed to load products, using default data');
      // Use default products on error
      setProducts(filterProductsByCategory(defaultProducts, category));
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
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
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-6">
      {products.map((product) => (
        <div key={product.id} className="bg-white rounded-md shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="aspect-square relative">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.discount > 0 && (
              <div className="absolute top-2 left-2">
                <span className="bg-red-500 text-white text-sm font-bold px-2 py-1 rounded">
                  -{product.discount}%
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
  );
}
