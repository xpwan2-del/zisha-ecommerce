"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { convertCurrency, formatCurrency } from '@/lib/utils/currency';

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-xl">Loading...</div></div>}>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();
  const { currency } = useCurrency();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [materials, setMaterials] = useState<string[]>([]);
  const [capacities, setCapacities] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const searchTriggerRef = useRef(0);

  // 加载分类
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          console.error('Categories data is not an array:', data);
          setCategories([]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      }
    }
    fetchCategories();
  }, []);

  // 加载商品
  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '12',
          category: selectedCategory !== 'all' ? selectedCategory : '',
          search: search,
          sort: sort,
          minPrice: minPrice.toString(),
          maxPrice: maxPrice.toString()
        });
        
        const response = await fetch(`/api/products?${params.toString()}`);
        const data = await response.json();
        if (data && Array.isArray(data.products)) {
          setProducts(data.products);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
        } else {
          console.error('Products data is not in expected format:', data);
          setProducts([]);
          setTotal(0);
          setTotalPages(1);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, [selectedCategory, search, sort, minPrice, maxPrice, page]);

  const handleProductClick = (id: number) => {
    router.push(`/products/${id}`);
  };

  const handleFilterChange = () => {
    setPage(1);
  };

  const handleSearch = () => {
    setPage(1);
    searchTriggerRef.current += 1;
  };

  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">{t('products.title')}</h1>
        
        {/* Search bar */}
        <div className="mb-8">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder={t('products.search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleFilterChange()}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t('products.search')}
              </button>
            </div>
          </div>
        </div>
        
        {/* Category filter - hidden on mobile, use tabs in header */}
        <div className="hidden md:flex justify-center mb-8 overflow-x-auto">
          <div className="inline-flex rounded-md shadow-sm whitespace-nowrap">
            <button
              key="all"
              onClick={() => {
                setSelectedCategory('all');
                handleFilterChange();
              }}
              className={`px-4 py-2 text-sm font-medium ${selectedCategory === 'all' 
                ? 'bg-primary text-white' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                rounded-l-lg`}
            >
              {t('products.all')}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id.toString());
                  handleFilterChange();
                }}
                className={`px-4 py-2 text-sm font-medium ${selectedCategory === category.id.toString() 
                  ? 'bg-primary text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                {i18n.language === 'zh' ? category.name : i18n.language === 'en' ? category.name_en : category.name_ar}
              </button>
            ))}
            <button
              key="sort"
              onClick={() => {
                const sorts = ['newest', 'price-asc', 'price-desc', 'sales'];
                const currentIndex = sorts.indexOf(sort);
                const nextSort = sorts[(currentIndex + 1) % sorts.length];
                setSort(nextSort);
                handleFilterChange();
              }}
              className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-2 text-sm font-medium rounded-r-lg"
            >
              {t('products.sort')}: {sort}
            </button>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Right content - products */}
          <div className="w-full">
            {/* Products grid */}
            {isLoading ? (
              <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-6">
                  {products.map((product) => (
                    <div 
                      key={product.id} 
                      className={`bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer ${product.display_mode === 'single' ? 'col-span-2 sm:col-span-1' : ''}`}
                      onClick={() => handleProductClick(product.id)}
                    >
                      <div className="aspect-square overflow-hidden relative">
                        {product.is_limited && product.discount > 0 && (
                          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold z-10">
                            {product.discount}% OFF
                          </div>
                        )}
                        <img 
                          src={Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/400'}
                          alt={product.name} 
                          className={`w-full aspect-square object-cover transition-transform duration-500 hover:scale-105 ${product.display_mode === 'single' ? 'lg:h-80 lg:object-contain' : ''}`}
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-semibold mb-2 line-clamp-2">{product.name}</h3>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl font-bold text-primary">{formatCurrency(convertCurrency(product.price, 'aed', currency), currency)}</span>
                          {product.original_price > 0 && product.original_price > product.price && (
                            <span className="text-sm text-gray-500 line-through">{formatCurrency(convertCurrency(product.original_price, 'aed', currency), currency)}</span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{product.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">{t('products.stock', { count: product.stock })}</span>
                          <button className="bg-primary hover:bg-primary/90 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300">
                            {t('products.view')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <nav className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:opacity-50"
                      >
                        {t('products.prev')}
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-4 py-2 rounded-lg ${pageNum === page 
                            ? 'bg-primary text-white' 
                            : 'border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white'}`}
                        >
                          {pageNum}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:opacity-50"
                      >
                        {t('products.next')}
                      </button>
                    </nav>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center items-center h-96">
                <p className="text-xl">{t('products.no_products')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}