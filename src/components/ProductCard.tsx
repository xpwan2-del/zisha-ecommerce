"use client";

import Link from "next/link";
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { convertCurrency, formatCurrency } from '@/lib/utils/currency';
import { useTranslation } from "react-i18next";

interface Activity {
  id: number;
  name: string;
  name_en?: string;
  name_ar?: string;
  icon?: string;
  color: string;
}

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    name_en?: string;
    name_ar?: string;
    price: number;
    original_price?: number;
    originalPrice?: number;
    discount?: number;
    daily_discount?: number;
    image: string;
    images?: string[];
    rating?: number;
    reviewCount?: number;
    inStock?: boolean;
    fastDelivery?: boolean;
    bestSeller?: boolean;
    new?: boolean;
    stock?: number;
    is_limited?: boolean;
    activities?: Activity[];
    activity_tag?: string;
    activity_icon?: string;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { currency } = useCurrency();
  const { t, i18n } = useTranslation();

  // 获取产品名称（多语言）
  const getProductName = () => {
    if (i18n.language === "zh") return product.name;
    if (i18n.language === "ar") return product.name_ar || product.name_en || product.name;
    return product.name_en || product.name;
  };

  // 分类活动标签
  const getDiscountBadges = () => {
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
    if (product.is_limited) {
      badges.push({
        type: 'limited',
        text: '限量',
        color: '#CA8A04'
      });
    }
    return badges;
  };

  // 分类状态标签
  const getStatusBadges = () => {
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
    if (product.stock && product.stock < 10 && product.stock > 0) {
      badges.push({
        type: 'limited',
        text: '库存有限',
        color: '#6366F1'
      });
    }
    return badges;
  };

  // 获取普通活动标签
  const getActivityTags = () => {
    // 处理不同的数据结构
    if (product.activities && Array.isArray(product.activities)) {
      return product.activities.filter((activity: Activity) => 
        !['今日特惠', '特惠产品'].includes(activity.name)
      ).map((activity: Activity) => ({
        ...activity,
        color: activity.color || '#8B5CF6', // 确保每个活动都有一个颜色属性
        icon: activity.icon || 'tag' // 确保每个活动都有一个图标属性
      }));
    }
    // 处理单独的活动标签字段
    else if (product.activity_tag) {
      return [{
        id: product.id,
        name: product.activity_tag,
        icon: product.activity_icon || 'tag',
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
    return (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    );
  };

  const discountBadges = getDiscountBadges();
  const statusBadges = getStatusBadges();
  const activityTags = getActivityTags();
  const productName = getProductName();
  const productImage = product.images?.[0] || product.image;
  const originalPrice = product.original_price || product.originalPrice;

  return (
    <div className="bg-white rounded-md shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-square relative">
        <Link href={`/products/${product.id}`}>
          <img
            src={productImage}
            alt={productName}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
        </Link>
        
        {/* 折扣标签 - 左上角 */}
        <div className="absolute top-1 left-1 flex flex-col gap-1.5">
          {discountBadges.slice(0, 3).map((badge) => (
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
          {getStars(product.rating || 4.5)}
          <span className="text-xs text-gray-500 ml-1">
            ({product.reviewCount || 50})
          </span>
        </div>

        <Link href={`/products/${product.id}`}>
          <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 hover:text-amazon-orange transition-colors">
            {productName}
          </h3>
        </Link>

        {/* 普通活动标签 - 商品名称下方 */}
        {activityTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {activityTags.slice(0, 4).map((activity: Activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-md shadow-sm hover:shadow-md transition-all duration-300"
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
              {formatCurrency(convertCurrency(product.price, 'aed', currency), currency)}
            </span>
            {originalPrice > 0 && (
              <span className="text-sm text-gray-500 line-through ml-2">
                {formatCurrency(convertCurrency(originalPrice, 'aed', currency), currency)}
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
          {product.stock && (
            <span>{t("products.stock", { count: product.stock })}</span>
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
}
