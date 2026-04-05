"use client";

import Link from "next/link";

interface FeaturedProductsProps {
  category?: string;
}

export function FeaturedProducts({ category = "all" }: FeaturedProductsProps) {
  // 产品数据
  const products = [
    {
      id: 1,
      name: "经典石瓢壶 - 宜兴紫砂壶手工制作",
      description: "传统工艺，手工制作，优质紫砂泥料",
      price: 899,
      originalPrice: 1299,
      discount: 30,
      image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=yixing%20zisha%20teapot%20stone%20gourd%20shape%20traditional%20chinese%20tea%20pot%20high%20quality%20professional%20photography%20white%20background&image_size=landscape_16_9",
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
      image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=yixing%20zisha%20teapot%20xishi%20shape%20elegant%20design%20traditional%20chinese%20tea%20pot%20high%20quality%20professional%20photography%20white%20background&image_size=landscape_16_9",
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
      image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20cups%20set%20traditional%20chinese%20tea%20cups%20elegant%20design%20high%20quality%20professional%20photography%20white%20background&image_size=landscape_16_9",
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
      image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20tea%20caddy%20traditional%20chinese%20tea%20storage%20jar%20sealed%20high%20quality%20professional%20photography%20white%20background&image_size=landscape_16_9",
      category: "3",
      rating: 4.6,
      reviewCount: 76,
      inStock: true,
    },
  ];

  // 根据分类筛选产品
  const filteredProducts = category === "all" 
    ? products 
    : products.filter(product => product.category === category);

  // 生成星级评分
  const getStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? "text-[#CA8A04]" : "text-gray-300"}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {filteredProducts.map((product) => (
        <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-[#7C2D12]/20">
          <div className="aspect-square relative overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            />
            {product.discount > 0 && (
              <div className="absolute top-3 left-3">
                <span className="bg-[#B91C1C] text-white text-sm font-bold px-3 py-1 rounded-md">
                  -{product.discount}%
                </span>
              </div>
            )}
            {product.bestSeller && (
              <div className="absolute top-3 right-3">
                <span className="bg-[#CA8A04] text-white text-xs font-bold px-3 py-1 rounded-md">
                  畅销
                </span>
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="flex items-center mb-3">
              {getStars(product.rating)}
              <span className="text-xs text-[#450A0A] ml-2 font-['Noto_Sans_TC']">
                ({product.reviewCount})
              </span>
            </div>

            <h3 className="text-base font-semibold text-[#450A0A] mb-3 line-clamp-2 font-['Noto_Serif_TC']">
              {product.name}
            </h3>

            <div className="mb-4">
              <div className="flex items-baseline">
                <span className="text-xl font-bold text-[#CA8A04] font-['Noto_Serif_TC']">
                  ¥{product.price}
                </span>
                {product.originalPrice > 0 && (
                  <span className="text-sm text-[#450A0A]/60 line-through ml-2 font-['Noto_Sans_TC']">
                    ¥{product.originalPrice}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center text-xs text-[#450A0A] mb-4 font-['Noto_Sans_TC']">
              {product.inStock && (
                <span className="text-green-600 mr-3">有货</span>
              )}
              {product.fastDelivery && (
                <span className="mr-3">快速配送</span>
              )}
            </div>

            <Link
              href={`/products/${product.id}`}
              className="block w-full bg-[#CA8A04] hover:bg-[#B47C03] text-white text-sm font-medium py-3 px-4 rounded-md transition-colors duration-300 text-center font-['Noto_Sans_TC']"
            >
              查看详情
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}