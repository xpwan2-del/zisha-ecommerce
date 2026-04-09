"use client";

import { useTranslation } from "react-i18next";
import { useState } from "react";

export function Categories() {
  const { t } = useTranslation();
  const originalCategories = t('categories.items', { returnObjects: true }) as string[];
  
  // 添加 All 选项到分类列表开头
  const categories = ['All', ...originalCategories];
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 分类的英文翻译（用于装饰性显示）
  const categoryEnNames = ['ALL', 'Teapots', 'Tea Cups', 'Accessories', 'Gift Sets'];
  
  // 分类的简短描述
  const categoryDescs = [
    '全部精选 · 匠心之作',
    '传世之作 · 匠心独运',
    '品茗雅器 · 温润如玉', 
    '茶道配件 · 精致考究',
    '礼赠佳品 · 尊贵典雅'
  ];

  return (
    <section className="py-8 px-4 bg-[#FAFAF9]">
      <div className="max-w-5xl mx-auto">
        {/* Section Header - Luxury Minimal Style */}
        <div className="text-center mb-12">
          <span className="inline-block text-xs text-[#CA8A04] tracking-[0.3em] uppercase font-medium mb-4">
            Collection
          </span>
          <h2 
            className="text-3xl md:text-4xl font-light text-[#1C1917] mb-4"
            style={{ fontFamily: 'Cormorant, serif' }}
          >
            {t('categories.title') || '产品分类'}
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-px bg-[#D4D4D4]"></div>
            <div className="w-2 h-2 rotate-45 border border-[#CA8A04]"></div>
            <div className="w-12 h-px bg-[#D4D4D4]"></div>
          </div>
        </div>

        {/* Categories - Slim Cards in One Row */}
        <div className="grid grid-cols-5 gap-4">
          {categories.map((category: string, index: number) => (
            <div 
              key={index} 
              className="group cursor-pointer relative"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Card Container */}
              <div className={`
                relative bg-white border transition-all duration-500 ease-out
                ${hoveredIndex === index 
                  ? 'border-[#CA8A04] shadow-lg shadow-[#CA8A04]/10' 
                  : 'border-[#E7E5E4] shadow-sm'
                }
              `}>
                {/* Top Gold Line - Appears on Hover */}
                <div className={`
                  absolute top-0 left-0 right-0 h-[1px] bg-[#CA8A04] transition-transform duration-500 origin-left
                  ${hoveredIndex === index ? 'scale-x-100' : 'scale-x-0'}
                `}></div>
                
                {/* Content */}
                <div className="p-4 text-center">
                  {/* Category Number */}
                  <span className={`
                    text-xs tracking-widest transition-colors duration-300
                    ${hoveredIndex === index ? 'text-[#CA8A04]' : 'text-[#A8A29E]'}
                  `}>
                    0{index + 1}
                  </span>
                  
                  {/* Main Category Name */}
                  <h3 
                    className={`
                      text-lg font-normal mt-2 mb-1 transition-colors duration-300
                      ${hoveredIndex === index ? 'text-[#CA8A04]' : 'text-[#1C1917]'}
                    `}
                    style={{ fontFamily: 'Cormorant, serif' }}
                  >
                    {category === 'All' ? '全部' : category}
                  </h3>
                  
                  {/* English Name */}
                  <p className="text-xs text-[#A8A29E] tracking-[0.2em] uppercase mb-2">
                    {categoryEnNames[index]}
                  </p>
                  
                  {/* Decorative Line */}
                  <div className={`
                    w-4 h-px mx-auto mb-2 transition-all duration-500
                    ${hoveredIndex === index ? 'w-8 bg-[#CA8A04]' : 'bg-[#D4D4D4]'}
                  `}></div>
                  
                  {/* Description */}
                  <p className="text-xs text-[#78716C] font-light tracking-wide">
                    {categoryDescs[index]}
                  </p>
                  
                  {/* Explore Link - Appears on Hover */}
                  <div className={`
                    mt-3 overflow-hidden transition-all duration-500
                    ${hoveredIndex === index ? 'opacity-100 max-h-6' : 'opacity-0 max-h-0'}
                  `}>
                    <span className="inline-flex items-center text-xs text-[#CA8A04] tracking-widest uppercase">
                      探索系列
                      <svg className="w-2.5 h-2.5 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </div>
                
                {/* Corner Decoration */}
                <div className={`
                  absolute bottom-0 right-0 w-4 h-4 transition-opacity duration-500
                  ${hoveredIndex === index ? 'opacity-100' : 'opacity-0'}
                `}>
                  <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-[#CA8A04]"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Bottom Decorative Text */}
        <div className="text-center mt-12">
          <p className="text-xs text-[#A8A29E] tracking-[0.2em] uppercase">
            Handcrafted Excellence Since 1990
          </p>
        </div>
      </div>
    </section>
  );
}
