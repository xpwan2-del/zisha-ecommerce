"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";

interface HomeModule {
  id: number;
  type: 'hero' | 'activity';
  title: string;
  title_en: string;
  title_ar: string;
  description: string;
  description_en: string;
  description_ar: string;
  image: string;
  link?: string;
  is_active: boolean;
  order: number;
  button_text?: string;
  button_text_en?: string;
  button_text_ar?: string;
  button_link?: string;
  secondary_button_text?: string;
  secondary_button_text_en?: string;
  secondary_button_text_ar?: string;
  secondary_button_link?: string;
}

interface HomeData {
  modules: HomeModule[];
  guarantees: any[];
  categories: any[];
  products: {
    products: any[];
    total: number;
    totalPages: number;
  };
}

interface HomeModulesProps {
  data: HomeData;
}

export function HomeModules({ data }: HomeModulesProps) {
  const { t, i18n } = useTranslation();
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // 从 props 中获取数据
  const modules = data.modules || [];
  const guarantees = data.guarantees || [];

  // 自动轮播所有项（包括Hero和活动）
  useEffect(() => {
    setIsVisible(true);
    const heroModule = modules.find(module => module.type === 'hero');
    const activityModules = modules.filter(module => module.type === 'activity');
    const allSlides = [heroModule, ...activityModules].filter(Boolean);
    
    if (allSlides.length > 0) {
      const interval = setInterval(() => {
        setCurrentActivityIndex((prevIndex) => (prevIndex + 1) % allSlides.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [modules]);

  // 检查重复 key
  useEffect(() => {
    const heroModule = modules.find(module => module.type === 'hero');
    const activityModules = modules.filter(module => module.type === 'activity');
    const allSlides = [heroModule, ...activityModules].filter(Boolean);
    
    const slideIds = allSlides.map(slide => slide?.id);
    const duplicateIds = slideIds.filter((id, index) => slideIds.indexOf(id) !== index);
    
    if (duplicateIds.length > 0) {
      console.error('Duplicate slide IDs found:', duplicateIds);
    }
  }, [modules]);

  const getLocalizedText = (zh: string, en: string, ar: string) => {
    const locale = i18n.language;
    if (locale === 'zh') return zh;
    if (locale === 'en') return en;
    if (locale === 'ar') return ar;
    return zh;
  };

  const renderCombinedModules = (heroModule: HomeModule, activityModules: HomeModule[]) => {
    // 合并所有轮播项，包括Hero和活动
    const allSlides = [heroModule, ...activityModules].filter(Boolean);
    
    return (
      <section className="relative bg-[#FDF2F8] overflow-hidden middle-east-pattern">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
          {/* Combined Carousel */}
          <div className="relative rounded-lg overflow-hidden shadow-lg h-[350px] md:h-[450px] mb-6 glass-effect">
            {allSlides.map((slide, index) => (
              <div
                key={`${slide.id}-${index}`}
                className={`absolute inset-0 transition-opacity duration-1000 ${index === currentActivityIndex ? 'opacity-100' : 'opacity-0'}`}
              >
                {/* Hero slide */}
                {slide.type === 'hero' ? (
                  <div className="h-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full p-4 sm:p-6">
                      <div className="space-y-4 sm:space-y-6 order-2 lg:order-1">
                        <div className="space-y-2 sm:space-y-3">
                          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-[#831843] leading-tight font-['Noto_Naskh_Arabic']">
                            {getLocalizedText(slide.title, slide.title_en, slide.title_ar)}
                          </h1>
                          <p className="text-sm sm:text-base md:text-lg text-[#831843] leading-relaxed font-['Noto_Sans_Arabic']">
                            源自中国的顶级茶具
                          </p>
                        </div>
                        
                        <p className="text-xs sm:text-sm md:text-base text-[#831843] leading-relaxed font-['Noto_Sans_Arabic']">
                          {getLocalizedText(slide.description, slide.description_en, slide.description_ar)}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          {slide.button_text && slide.button_link && (
                            <a 
                              href={slide.button_link} 
                              className="bg-[#CA8A04] hover:bg-[#B47C03] text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-md transition-colors duration-300 flex items-center justify-center text-sm sm:text-lg"
                            >
                              {getLocalizedText(slide.button_text, slide.button_text_en || '', slide.button_text_ar || '')}
                            </a>
                          )}
                          {slide.secondary_button_text && slide.secondary_button_link && (
                            <a 
                              href={slide.secondary_button_link} 
                              className="border-2 border-[#DB2777] hover:bg-[#DB2777] hover:text-white text-[#831843] py-2 sm:py-3 px-4 sm:px-6 rounded-md font-medium transition-all duration-300 flex items-center justify-center text-sm sm:text-lg"
                            >
                              {getLocalizedText(slide.secondary_button_text, slide.secondary_button_text_en || '', slide.secondary_button_text_ar || '')}
                            </a>
                          )}
                        </div>
                      </div>
                      
                      <div className="relative order-1 lg:order-2">
                        <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden shadow-2xl fluid-animation">
                          <img
                            src={slide.image}
                            alt={slide.title}
                            className="object-cover w-full h-full transition-transform duration-500 hover:scale-105"
                          />
                        </div>
                        {slide.button_text && (
                          <div className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 bg-[#CA8A04] text-white px-3 sm:px-4 py-1 sm:py-2 rounded-md shadow-lg font-bold font-['Noto_Naskh_Arabic'] text-xs sm:text-base">
                            {getLocalizedText(slide.button_text, slide.button_text_en || '', slide.button_text_ar || '')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Activity slide
                  <a href={slide.link || '#'} className="block h-full">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#831843]/80 to-transparent flex items-end">
                      <div className="p-6 text-white">
                        <h3 className="text-2xl md:text-3xl font-bold mb-2 font-['Noto_Naskh_Arabic']">
                          {getLocalizedText(slide.title, slide.title_en, slide.title_ar)}
                        </h3>
                        <p className="text-base md:text-lg font-['Noto_Sans_Arabic']">
                          {getLocalizedText(slide.description, slide.description_en, slide.description_ar)}
                        </p>
                      </div>
                    </div>
                  </a>
                )}
              </div>
            ))}
            
            {/* Carousel indicators */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
              {allSlides.map((slide, index) => (
                <button
                  key={`indicator-${slide.id}-${index}`}
                  onClick={() => setCurrentActivityIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentActivityIndex ? 'bg-[#CA8A04] w-8' : 'bg-white/70'}`}
                ></button>
              ))}
            </div>
          </div>
          
          {/* Scrolling service guarantees */}
          <div className="overflow-hidden glass-effect rounded-lg p-4">
            <div className="flex animate-scroll whitespace-nowrap">
              <div className="flex space-x-6 py-3">
                {guarantees.map((guarantee, index) => (
                  <div key={guarantee.id} className="flex items-center space-x-2 flex-shrink-0 px-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: guarantee.color }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-[#831843] font-['Noto_Sans_Arabic']">
                      {getLocalizedText(guarantee.text, guarantee.text_en, guarantee.text_ar)}
                    </span>
                  </div>
                ))}
                {/* Duplicate for continuous scrolling */}
                {guarantees.map((guarantee, index) => (
                  <div key={`dup-${guarantee.id}`} className="flex items-center space-x-2 flex-shrink-0 px-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: guarantee.color }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-[#831843] font-['Noto_Sans_Arabic']">
                      {getLocalizedText(guarantee.text, guarantee.text_en, guarantee.text_ar)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const heroModule = modules.find(module => module.type === 'hero');
  const activityModules = modules.filter(module => module.type === 'activity');

  if (!heroModule) {
    // 如果没有Hero模块，只显示活动轮播
    if (activityModules.length > 0) {
      return (
        <section className="bg-white py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="relative rounded-lg overflow-hidden shadow-lg h-[300px] md:h-[400px] mb-8">
              {activityModules.map((activity, index) => (
                <div
                  key={`${activity.id}-${index}`}
                  className={`absolute inset-0 transition-opacity duration-1000 ${index === currentActivityIndex ? 'opacity-100' : 'opacity-0'}`}
                >
                  <a href={activity.link || '#'} className="block h-full">
                    <img
                      src={activity.image}
                      alt={activity.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#450A0A]/80 to-transparent flex items-end">
                      <div className="p-6 text-white">
                        <h3 className="text-2xl md:text-3xl font-bold mb-2 font-['Noto_Serif_TC']">
                          {getLocalizedText(activity.title, activity.title_en, activity.title_ar)}
                        </h3>
                        <p className="text-base md:text-lg font-['Noto_Sans_TC']">
                          {getLocalizedText(activity.description, activity.description_en, activity.description_ar)}
                        </p>
                      </div>
                    </div>
                  </a>
                </div>
              ))}
              
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                {activityModules.map((activity, index) => (
                  <button
                    key={`activity-indicator-${activity.id}-${index}`}
                    onClick={() => setCurrentActivityIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentActivityIndex ? 'bg-[#CA8A04] w-8' : 'bg-white/70'}`}
                  ></button>
                ))}
              </div>
            </div>
            
            <div className="overflow-hidden">
              <div className="flex animate-scroll whitespace-nowrap">
                <div className="flex space-x-8 py-4">
                  <div className="flex items-center space-x-2 flex-shrink-0 px-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#CA8A04]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-[#450A0A] font-['Noto_Sans_TC']">Free shipping on orders over $50</span>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0 px-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#CA8A04]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-[#450A0A] font-['Noto_Sans_TC']">30-day returns</span>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0 px-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#CA8A04]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-[#450A0A] font-['Noto_Sans_TC']">Authentic guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }
    return null;
  }

  return renderCombinedModules(heroModule, activityModules);
}
