"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Pagination } from "./Pagination";
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { ProductCard } from "./ProductCard";

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
      description: "优雅西施造型，送礼佳品，高端茶具",
      price: 1299,
      originalPrice: 1899,
      discount: 32,
      image: "https://image.pollinations.ai/prompt/yixing%20zisha%20teapot%20xi%20shi%20shape%20beauty%20style%20chinese%20tea%20pot%20elegant%20design%20professional%20photography%20white%20background?width=400&height=400&seed=2",
      category: "1",
      rating: 4.9,
      reviewCount: 86,
      inStock: true,
      fastDelivery: true,
      new: true,
    },
    {
      id: 3,
      name: "紫砂品茗杯 - 功夫茶杯套装",
      description: "小容量茶杯，适合功夫茶，精美礼盒包装",
      price: 299,
      originalPrice: 499,
      discount: 40,
      image: "https://image.pollinations.ai/prompt/zisha%20tea%20cups%20set%20small%20traditional%20chinese%20tea%20cups%20kung%20fu%20tea%20ceremony%20professional%20photography%20white%20background?width=400&height=400&seed=3",
      category: "2",
      rating: 4.7,
      reviewCount: 215,
      inStock: true,
      fastDelivery: true,
      bestSeller: true,
    },
    {
      id: 4,
      name: "公道杯 - 陶瓷茶海分茶器",
      description: "均匀分茶，公道自在，茶道必备",
      price: 199,
      originalPrice: 299,
      discount: 33,
      image: "https://image.pollinations.ai/prompt/chinese%20gong%20dao%20bei%20fairness%20cup%20ceramic%20tea%20server%20traditional%20tea%20ceremony%20professional%20photography%20white%20background?width=400&height=400&seed=4",
      category: "3",
      rating: 4.6,
      reviewCount: 156,
      inStock: true,
      fastDelivery: false,
    },
    {
      id: 5,
      name: "紫砂壶套装 - 一壶四杯礼盒装",
      description: "完整茶具套装，适合送礼，自用两相宜",
      price: 1699,
      originalPrice: 2499,
      discount: 32,
      image: "https://image.pollinations.ai/prompt/zisha%20teapot%20set%20one%20pot%20four%20cups%20gift%20box%20traditional%20chinese%20tea%20set%20professional%20photography%20white%20background?width=400&height=400&seed=5",
      category: "4",
      rating: 4.8,
      reviewCount: 78,
      inStock: true,
      fastDelivery: true,
      new: true,
    },
    {
      id: 6,
      name: "茶漏 - 不锈钢过滤网",
      description: "精细过滤，茶汤清澈，经久耐用",
      price: 89,
      originalPrice: 129,
      discount: 31,
      image: "https://image.pollinations.ai/prompt/tea%20strainer%20stainless%20steel%20fine%20mesh%20chinese%20tea%20accessory%20professional%20photography%20white%20background?width=400&height=400&seed=6",
      category: "3",
      rating: 4.5,
      reviewCount: 234,
      inStock: true,
      fastDelivery: true,
    },
    {
      id: 7,
      name: "梅桩壶 - 精品紫砂壶",
      description: "梅花桩造型，寓意吉祥，收藏价值高",
      price: 2999,
      originalPrice: 3999,
      discount: 25,
      image: "https://image.pollinations.ai/prompt/plum%20blossom%20zisha%20teapot%20tree%20stump%20shape%20traditional%20chinese%20art%20tea%20pot%20professional%20photography%20white%20background?width=400&height=400&seed=7",
      category: "1",
      rating: 4.9,
      reviewCount: 45,
      inStock: false,
      fastDelivery: false,
      stock: 0,
    },
    {
      id: 8,
      name: "紫砂盖碗 - 三才碗茶具",
      description: "传统三才碗，盖为天，托为地，碗为人",
      price: 399,
      originalPrice: 599,
      discount: 33,
      image: "https://image.pollinations.ai/prompt/zisha%20gaiwan%20three%20talents%20bowl%20traditional%20chinese%20tea%20ceremony%20professional%20photography%20white%20background?width=400&height=400&seed=8",
      category: "2",
      rating: 4.7,
      reviewCount: 189,
      inStock: true,
      fastDelivery: true,
    },
    {
      id: 9,
      name: "茶道六君子 - 实木茶夹茶针套装",
      description: "茶道必备工具，实木材质，精美礼盒",
      price: 159,
      originalPrice: 259,
      discount: 38,
      image: "https://image.pollinations.ai/prompt/chinese%20tea%20ceremony%20six%20gentlemen%20tools%20wooden%20tea%20accessories%20set%20professional%20photography%20white%20background?width=400&height=400&seed=9",
      category: "3",
      rating: 4.6,
      reviewCount: 267,
      inStock: true,
      fastDelivery: true,
    },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (data && data.products && Array.isArray(data.products) && data.products.length > 0) {
          setAllProducts(data.products);
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/products?category=${category}`);
        const result = await response.json();
        
        if (result.success && result.data && Array.isArray(result.data)) {
          setAllProducts(result.data);
        } else if (result.products && Array.isArray(result.products)) {
          setAllProducts(result.products);
        } else {
          setAllProducts(defaultProducts);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to fetch products');
        setAllProducts(defaultProducts);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [category, data]);

  useEffect(() => {
    // 确保 allProducts 是数组
    if (!Array.isArray(allProducts)) {
      setAllProducts(defaultProducts);
      return;
    }
    
    // 计算总页数
    const pages = Math.ceil(allProducts.length / productsPerPage);
    setTotalPages(pages);
    
    // 计算当前页的产品
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = allProducts.slice(indexOfFirstProduct, indexOfLastProduct);
    setProducts(currentProducts);
  }, [allProducts, currentPage]);

  if (isLoading) {
    return (
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
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Link 
          href="/" 
          className="px-6 py-3 bg-amazon-orange text-white rounded hover:bg-amazon-light-orange transition-colors"
        >
          返回首页
        </Link>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">暂无产品</p>
        <Link 
          href="/" 
          className="px-6 py-3 bg-amazon-orange text-white rounded hover:bg-amazon-light-orange transition-colors"
        >
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
