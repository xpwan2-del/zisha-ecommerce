"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCart } from "@/lib/contexts/CartContext";

export function FeaturedProducts() {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const [activeCategory, setActiveCategory] = useState("all");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取分类名称，根据当前语言
  const getCategoryName = (categoryId: string) => {
    const locale = t('locale');
    const categoryNames: Record<string, Record<string, string>> = {
      all: { zh: '全部产品', en: 'All Products', ar: 'جميع المنتجات' },
      teapots: { zh: '茶壶', en: 'Teapots', ar: 'إبوات الشاي' },
      cups: { zh: '茶杯', en: 'Cups', ar: 'أكواب' },
      sets: { zh: '套装', en: 'Sets', ar: 'مجموعات' },
      accessories: { zh: '配件', en: 'Accessories', ar: 'إكسسوارات' }
    };
    return categoryNames[categoryId]?.[locale] || categoryId;
  };

  // Default products data as fallback
  const defaultProducts = [
    {
      id: 1,
      name: "Classic Zisha Teapot",
      price: 120,
      originalPrice: 150,
      stock: 50,
      category: "teapots",
      images: [
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20zisha%20teapot%20with%20traditional%20design%20front%20view&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20zisha%20teapot%20side%20view&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20zisha%20teapot%20top%20view&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20zisha%20teapot%20with%20tea%20inside&image_size=square"
      ],
      description: "Handcrafted from authentic Yixing clay, this classic zisha teapot is perfect for brewing all types of tea. The natural porous nature of zisha clay helps to enhance the flavor of tea over time, making it a favorite among tea enthusiasts.",
      features: [
        "Authentic Yixing clay",
        "Handcrafted by skilled artisans",
        "150ml capacity",
        "Heat resistant",
        "Enhances tea flavor"
      ],
      isLimited: true,
      discount: 20
    },
    {
      id: 2,
      name: "Zisha Tea Cup Set",
      price: 85,
      originalPrice: 100,
      stock: 30,
      category: "cups",
      images: [
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20cups%20set%20of%204%20arranged%20on%20table&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20cups%20close%20up&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20cups%20stacked&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20cups%20with%20tea%20inside&image_size=square"
      ],
      description: "This elegant set of zisha tea cups is perfect for enjoying tea with friends and family. Each cup is handcrafted from authentic Yixing clay, providing a unique drinking experience.",
      features: [
        "Set of 4 cups",
        "Authentic Yixing clay",
        "60ml capacity each",
        "Smooth finish",
        "Stackable design"
      ],
      isLimited: false,
      discount: 0
    },
    {
      id: 3,
      name: "Premium Zisha Teapot",
      price: 180,
      originalPrice: 220,
      stock: 20,
      category: "teapots",
      images: [
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20zisha%20teapot%20with%20intricate%20carving%20front%20view&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20zisha%20teapot%20side%20view%20with%20carvings&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20zisha%20teapot%20top%20view&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20zisha%20teapot%20with%20wooden%20handle&image_size=square"
      ],
      description: "This premium zisha teapot features intricate hand-carved designs and is made from the finest Yixing clay. It's a true work of art that will enhance any tea ceremony.",
      features: [
        "Premium Yixing clay",
        "Intricate hand-carved designs",
        "200ml capacity",
        "Wooden handle",
        "Comes with a gift box"
      ],
      isLimited: true,
      discount: 18
    },
    {
      id: 4,
      name: "Zisha Tea Set Complete",
      price: 280,
      originalPrice: 350,
      stock: 15,
      category: "sets",
      images: [
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=complete%20zisha%20tea%20set%20with%20teapot%20cups%20and%20tray&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20set%20arranged%20on%20table&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20set%20close%20up&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20set%20with%20brewing%20tea&image_size=square"
      ],
      description: "This complete zisha tea set includes a teapot, four cups, and a tea tray. It's everything you need to start enjoying the traditional Chinese tea ceremony at home.",
      features: [
        "Complete tea set",
        "Authentic Yixing clay",
        "Teapot + 4 cups + tray",
        "Elegant design",
        "Perfect for gifting"
      ],
      isLimited: true,
      discount: 20
    },
    {
      id: 5,
      name: "Zisha Tea Accessories",
      price: 50,
      originalPrice: 60,
      stock: 40,
      category: "accessories",
      images: [
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20accessories%20set%20with%20strainer%20spoon%20and%20pick&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tea%20strainer%20close%20up&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tea%20spoon%20and%20pick&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tea%20accessories%20in%20use&image_size=square"
      ],
      description: "This set of zisha tea accessories includes a tea strainer, tea spoon, and tea pick. These essential tools will enhance your tea brewing experience.",
      features: [
        "Set of 3 accessories",
        "Strainer + spoon + pick",
        "Durable construction",
        "Easy to clean",
        "Essential for tea brewing"
      ],
      isLimited: false,
      discount: 0
    },
    {
      id: 6,
      name: "Mini Zisha Teapot",
      price: 90,
      originalPrice: 110,
      stock: 25,
      category: "teapots",
      images: [
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mini%20zisha%20teapot%20portable%20front%20view&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mini%20zisha%20teapot%20side%20view&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mini%20zisha%20teapot%20with%20tea%20inside&image_size=square",
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mini%20zisha%20teapot%20in%20hand&image_size=square"
      ],
      description: "This compact mini zisha teapot is perfect for travel or for enjoying a single cup of tea. Despite its small size, it retains all the qualities of a traditional zisha teapot.",
      features: [
        "Compact size",
        "Perfect for travel",
        "80ml capacity",
        "Lightweight design",
        "Portable and convenient"
      ],
      isLimited: true,
      discount: 18
    }
  ];

  useEffect(() => {
    fetchProducts();
  }, [activeCategory]);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products?category=${activeCategory}`);
      const data = await response.json();
      
      // Check if data is an array
      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        // Use default products if API returns non-array
        console.warn('API returned non-array data, using default products');
        setProducts(filterProductsByCategory(defaultProducts, activeCategory));
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setError('Failed to load products, using default data');
      // Use default products on error
      setProducts(filterProductsByCategory(defaultProducts, activeCategory));
    } finally {
      setIsLoading(false);
    }
  };

  const filterProductsByCategory = (productList: any[], category: string) => {
    if (category === 'all') {
      return productList;
    }
    return productList.filter(product => product.category === category);
  };

  const handleAddToCart = (product: any) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0]
    });
    alert(`${product.name} has been added to your cart!`);
  };

  const handleBuyNow = (product: any) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0]
    });
    window.location.href = "/cart";
  };

  if (isLoading) {
    return (
      <section id="shop" className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amazon-orange"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="shop" className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-3xl font-bold text-amazon-dark dark:text-white">{t('products.title') || 'Featured Products'}</h2>
          <a href="/products" className="amazon-link font-medium">
            {t('products.viewAll') || 'View All'}
          </a>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 mb-8">
          {['all', 'teapots', 'cups', 'sets', 'accessories'].map(categoryId => (
            <button
              key={categoryId}
              onClick={() => setActiveCategory(categoryId)}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${activeCategory === categoryId ? 'bg-amazon-orange text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              {getCategoryName(categoryId)}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id} className="amazon-card">
              {/* Product Image */}
              <div className="aspect-square relative overflow-hidden rounded-md mb-4">
                <img 
                  src={product.images[0]} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
                {product.isLimited && product.discount > 0 && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    -{product.discount}%
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 h-12">
                  {product.name}
                </h3>
                
                <div className="flex items-center space-x-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amazon-orange" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">(12)</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-baseline">
                    <span className="amazon-price">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.originalPrice > product.price && (
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 line-through">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {product.discount > 0 && (
                    <span className="amazon-discount text-sm">
                      Save {product.discount}%
                    </span>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Add to Cart
                  </button>
                  <button 
                    onClick={() => handleBuyNow(product)}
                    className="bg-amazon-orange hover:bg-amazon-light-orange text-amazon-dark text-sm font-medium py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
