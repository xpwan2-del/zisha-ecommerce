"use client";

import { useTranslation } from "react-i18next";

interface Category {
  id: string | number;
  name: string;
  name_en?: string;
  name_ar?: string;
  image?: string;
}

interface CategoriesProps {
  data?: any;
  categories?: Category[];
  selectedCategory?: string | number;
  onCategorySelect?: (categoryId: string | number) => void;
  showHeader?: boolean;
  compact?: boolean;
}

export function Categories({ 
  data, 
  categories: propCategories, 
  selectedCategory = "all", 
  onCategorySelect, 
  showHeader = true, 
  compact = false 
}: CategoriesProps) {
  const { t, i18n } = useTranslation();

  // 从data或propCategories获取分类数据
  const getCategories = (): Category[] => {
    if (propCategories && Array.isArray(propCategories)) {
      return propCategories;
    }
    
    if (data && data.categories && Array.isArray(data.categories)) {
      return data.categories;
    }
    
    // 默认分类数据
    return [
      {
        id: "1",
        name: "紫砂壶",
        name_en: "Teapots",
        name_ar: "إبوات الشاي"
      },
      {
        id: "2",
        name: "茶杯",
        name_en: "Cups",
        name_ar: "أكواب"
      },
      {
        id: "3",
        name: "茶配件",
        name_en: "Accessories",
        name_ar: "أكسسوارات"
      },
      {
        id: "4",
        name: "套装",
        name_en: "Sets",
        name_ar: "مجموعات"
      }
    ];
  };

  const categories = getCategories();
  
  // 添加All选项到开头
  const allCategory: Category = {
    id: "all",
    name: t('products.all') || '全部',
    name_en: "ALL",
    name_ar: "الكل"
  };
  
  const allCategories = [allCategory, ...categories];

  // 获取分类名称（多语言）
  const getCategoryName = (category: Category) => {
    if (i18n.language === "zh") return category.name;
    if (i18n.language === "ar") return category.name_ar || category.name_en || category.name;
    return category.name_en || category.name;
  };

  // 获取分类英文名称（用于显示）
  const getCategoryEnName = (category: Category) => {
    if (category.id === "all") return "ALL";
    return category.name_en?.toUpperCase() || category.name.toUpperCase();
  };

  // 获取分类描述
  const getCategoryDescription = (category: Category) => {
    const descriptions = {
      "all": "全部精选 · 匠心之作",
      "1": "传世之作 · 匠心独运",
      "2": "品茗雅器 · 温润如玉",
      "3": "茶道配件 · 精致考究",
      "4": "礼赠佳品 · 尊贵典雅"
    };
    return descriptions[category.id as keyof typeof descriptions] || "精选系列";
  };

  // 处理分类点击
  const handleCategoryClick = (categoryId: string | number) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    }
  };

  // 检查分类是否被选中
  const isCategorySelected = (categoryId: string | number) => {
    return selectedCategory === categoryId;
  };

  if (!showHeader && compact) {
    return (
      <div className="mb-8">
        <div className="flex flex-wrap gap-3 justify-center">
          {allCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`px-6 py-3 rounded-md transition-all duration-300 ${isCategorySelected(category.id) 
                ? 'bg-[#CA8A04] text-white font-medium' 
                : 'bg-white border border-[#E7E5E4] text-[#1C1917] hover:border-[#CA8A04] hover:shadow-md'}
              `}
            >
              {getCategoryName(category)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="py-8 bg-[#FAFAF9]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - Luxury Style */}
        {showHeader && (
          <div className="text-center mb-8">
            <p className="text-sm text-[#CA8A04] tracking-widest uppercase font-medium mb-4">
              精选系列
            </p>
            <h2 
              className="text-3xl font-bold text-[#1C1917] mb-4"
              style={{ fontFamily: 'Cormorant, serif' }}
            >
              {t('categories.title') || '产品分类'}
            </h2>
            <div className="w-24 h-px bg-[#CA8A04] mx-auto"></div>
          </div>
        )}

        {/* Categories Grid - Luxury Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {allCategories.map((category, index) => (
            <div 
              key={category.id}
              className={`group cursor-pointer transition-all duration-300 ${isCategorySelected(category.id) ? 'scale-105' : ''}`}
              onClick={() => handleCategoryClick(category.id)}
            >
              <div className={`relative overflow-hidden rounded-sm bg-white shadow-sm p-4 border-2 transition-all duration-300 ${isCategorySelected(category.id) 
                ? 'border-[#CA8A04] bg-[#FFFBEB] shadow-md' 
                : 'border-transparent hover:border-[#CA8A04] hover:shadow-md'}
              `}>
                {/* Number badge */}
                <div className="absolute top-3 left-3 text-[#CA8A04] font-bold text-xs tracking-wider">
                  {index + 1 < 10 ? `0${index + 1}` : index + 1}
                </div>
                
                <div className="text-center pt-2">
                  {/* Category Title - Luxury Style */}
                  <h3 
                    className={`text-xl font-semibold text-center transition-colors duration-300 ${isCategorySelected(category.id) 
                      ? 'text-[#CA8A04]' 
                      : 'text-[#1C1917] group-hover:text-[#CA8A04]'}
                    `}
                    style={{ fontFamily: 'Cormorant, serif' }}
                  >
                    {getCategoryName(category)}
                  </h3>
                  
                  {/* Category English Name */}
                  <p className="text-xs text-[#78716C] mt-1 font-medium tracking-wider">
                    {getCategoryEnName(category)}
                  </p>
                  
                  {/* Divider */}
                  <div className="w-6 h-px bg-[#E7E5E4] mx-auto my-3 transition-colors duration-300 group-hover:bg-[#CA8A04]"></div>
                  
                  {/* Category Description */}
                  <p className="text-xs text-[#78716C] text-center">
                    {getCategoryDescription(category)}
                  </p>
                  
                  {/* Hover Arrow */}
                  <div className="mt-4 flex justify-center">
                    <div className="w-6 h-6 rounded-full bg-[#FAFAF9] flex items-center justify-center transition-all duration-300 group-hover:bg-[#CA8A04] group-hover:text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#CA8A04' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Corner decoration */}
                <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 transition-colors duration-300 ${isCategorySelected(category.id) 
                  ? 'border-[#CA8A04]' 
                  : 'border-transparent group-hover:border-[#CA8A04]'}
                `}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
