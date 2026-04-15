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
  activities?: any[];
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

  const modules = data.modules || [];
  const guarantees = data.guarantees || [];

  useEffect(() => {
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

  const getLocalizedText = (zh: string, en: string, ar: string) => {
    const locale = i18n.language;
    if (locale === 'zh') return zh;
    if (locale === 'en') return en;
    if (locale === 'ar') return ar;
    return zh;
  };

  const renderCombinedModules = (heroModule: HomeModule, activityModules: HomeModule[]) => {
    const allSlides = [heroModule, ...activityModules].filter(Boolean);
    
    return (
      <section className="relative bg-background overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          {/* Combined Carousel - Luxury Style */}
          <div className="relative rounded-sm overflow-hidden shadow-2xl h-[400px] md:h-[500px] mb-8 bg-white">
            {allSlides.map((slide, index) => (
              <div
                key={`${slide.id}-${index}`}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === currentActivityIndex ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
              >
                {slide.type === 'hero' ? (
                  <div className="h-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full p-6 sm:p-10">
                      <div className="space-y-6 order-2 lg:order-1">
                        <div className="space-y-4">
                          <p className="text-sm text-accent tracking-widest uppercase font-medium">
                            源自中国的顶级茶具
                          </p>
                          <h1 
                            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text leading-tight"
                            style={{ fontFamily: 'Cormorant, serif' }}
                          >
                            {getLocalizedText(slide.title, slide.title_en, slide.title_ar)}
                          </h1>
                        </div>
                        
                        <p className="text-base text-text-muted leading-relaxed max-w-lg">
                          {getLocalizedText(slide.description, slide.description_en, slide.description_ar)}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          {slide.button_text && slide.button_link && (
                            <a 
                              href={slide.button_link} 
                              className="bg-accent hover:bg-accent text-white font-medium py-3 px-8 rounded-sm transition-all duration-300 flex items-center justify-center text-sm tracking-wide"
                              style={{ boxShadow: '0 4px 14px rgba(202, 138, 4, 0.3)' }}
                            >
                              {getLocalizedText(slide.button_text, slide.button_text_en || '', slide.button_text_ar || '')}
                            </a>
                          )}
                          {slide.secondary_button_text && slide.secondary_button_link && (
                            <a 
                              href={slide.secondary_button_link} 
                              className="border-2 border-text hover:bg-text hover:text-white text-text py-3 px-8 rounded-sm font-medium transition-all duration-300 flex items-center justify-center text-sm tracking-wide"
                            >
                              {getLocalizedText(slide.secondary_button_text, slide.secondary_button_text_en || '', slide.secondary_button_text_ar || '')}
                            </a>
                          )}
                        </div>
                      </div>
                      
                      <div className="relative order-1 lg:order-2">
                        <div className="aspect-w-4 aspect-h-3 rounded-sm overflow-hidden shadow-xl">
                          <img
                            src={slide.image}
                            alt={slide.title}
                            className="object-cover w-full h-full transition-transform duration-700 hover:scale-105"
                          />
                        </div>
                        {slide.button_text && (
                          <div 
                            className="absolute -bottom-4 -right-4 bg-accent text-white px-5 py-2 rounded-sm shadow-lg font-medium text-sm tracking-wide"
                            style={{ fontFamily: 'Cormorant, serif' }}
                          >
                            {getLocalizedText(slide.button_text, slide.button_text_en || '', slide.button_text_ar || '')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <a href={slide.link || '#'} className="block h-full">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark/90 to-transparent flex items-end">
                      <div className="p-8 text-white">
                        <h3 
                          className="text-2xl md:text-3xl font-bold mb-2"
                          style={{ fontFamily: 'Cormorant, serif' }}
                        >
                          {getLocalizedText(slide.title, slide.title_en, slide.title_ar)}
                        </h3>
                        <p className="text-base text-text-muted">
                          {getLocalizedText(slide.description, slide.description_en, slide.description_ar)}
                        </p>
                      </div>
                    </div>
                  </a>
                )}
              </div>
            ))}
            
            {/* Carousel indicators - Luxury Style */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 z-10">
              {allSlides.map((slide, index) => (
                <button
                  key={`indicator-${slide.id}-${index}`}
                  onClick={() => setCurrentActivityIndex(index)}
                  className={`h-1 rounded-full transition-all duration-300 ${index === currentActivityIndex ? 'bg-accent w-10' : 'bg-border w-6 hover:bg-accent/50'}`}
                ></button>
              ))}
            </div>
          </div>
          
          {/* Scrolling promotions - Luxury Style */}
          <div className="overflow-hidden bg-white rounded-sm shadow-sm border border-border p-5">
            <h3 className="text-lg font-medium text-text mb-4">平台活动</h3>
            <div className="flex animate-scroll whitespace-nowrap">
              <div className="flex space-x-6 py-2">
                {data.activities && data.activities.length > 0 ? (
                  <>
                    {data.activities.map((activity: any) => (
                      <div 
                        key={activity.id} 
                        className="flex flex-col items-center space-x-3 flex-shrink-0 px-4 w-72"
                      >
                        <a href={activity.link || '#'} className="block w-full group">
                          <div className="flex items-center space-x-4 p-4 border border-border rounded-sm shadow-sm hover:shadow-md transition-shadow duration-300 bg-white">
                            {/* 活动图标 */}
                            <div className="flex-shrink-0">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300 hover:scale-105 ${
                                activity.type === 'daily' ? 'bg-[#EB987F]' :
                                activity.type === 'special' ? 'bg-[#EB987F]' :
                                activity.type === 'category' ? 'bg-[#EB987F]' :
                                activity.type === 'product' ? 'bg-[#EB987F]' :
                                'bg-[#EB987F]'
                              }`}>
                                {activity.type === 'daily' && (
                                  <img src="/images/icons/promotion-daily.svg" alt="Daily promotion" className="w-6 h-6 text-white" />
                                )}
                                {activity.type === 'special' && (
                                  <img src="/images/icons/promotion-special.svg" alt="Special promotion" className="w-6 h-6 text-white" />
                                )}
                                {activity.type === 'category' && (
                                  <img src="/images/icons/promotion-category.svg" alt="Category promotion" className="w-6 h-6 text-white" />
                                )}
                                {activity.type === 'product' && (
                                  <img src="/images/icons/promotion-product.svg" alt="Product promotion" className="w-6 h-6 text-white" />
                                )}
                                {!['daily', 'special', 'category', 'product'].includes(activity.type) && (
                                  <img src="/images/icons/promotion-daily.svg" alt="Promotion" className="w-6 h-6 text-white" />
                                )}
                              </div>
                            </div>
                            {/* 活动信息 */}
                            <div className="flex-grow">
                              {/* 折扣标签 */}
                              {activity.discount_percent && (
                                <div className="inline-block bg-[#EB987F] text-white text-xs font-medium px-2 py-0.5 rounded-sm mb-1">
                                  {activity.discount_percent}% OFF
                                </div>
                              )}
                              <h4 className="text-sm font-medium text-text group-hover:text-accent transition-colors duration-300">
                                {getLocalizedText(activity.title, activity.title_en, activity.title_ar)}
                              </h4>
                              <p className="text-xs text-text-muted">
                                {getLocalizedText(activity.description, activity.description_en, activity.description_ar)}
                              </p>
                            </div>
                          </div>
                        </a>
                      </div>
                    ))}
                    {/* 重复一次活动列表，使滚动更流畅 */}
                    {data.activities.map((activity: any) => (
                      <div 
                        key={`dup-${activity.id}`} 
                        className="flex flex-col items-center space-x-3 flex-shrink-0 px-4 w-64"
                      >
                        <a href={activity.link || '#'} className="block w-full group">
                          <div className="flex items-center space-x-4 p-4 border border-border rounded-sm shadow-sm hover:shadow-md transition-shadow duration-300 bg-white">
                            {/* 活动图标 */}
                            <div className="flex-shrink-0">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300 hover:scale-105 ${
                                activity.type === 'daily' ? 'bg-[#EB987F]' :
                                activity.type === 'special' ? 'bg-[#EB987F]' :
                                activity.type === 'category' ? 'bg-[#EB987F]' :
                                activity.type === 'product' ? 'bg-[#EB987F]' :
                                'bg-[#EB987F]'
                              }`}>
                                {activity.type === 'daily' && (
                                  <img src="/images/icons/promotion-daily.svg" alt="Daily promotion" className="w-6 h-6 text-white" />
                                )}
                                {activity.type === 'special' && (
                                  <img src="/images/icons/promotion-special.svg" alt="Special promotion" className="w-6 h-6 text-white" />
                                )}
                                {activity.type === 'category' && (
                                  <img src="/images/icons/promotion-category.svg" alt="Category promotion" className="w-6 h-6 text-white" />
                                )}
                                {activity.type === 'product' && (
                                  <img src="/images/icons/promotion-product.svg" alt="Product promotion" className="w-6 h-6 text-white" />
                                )}
                                {!['daily', 'special', 'category', 'product'].includes(activity.type) && (
                                  <img src="/images/icons/promotion-daily.svg" alt="Promotion" className="w-6 h-6 text-white" />
                                )}
                              </div>
                            </div>
                            {/* 活动信息 */}
                            <div className="flex-grow">
                              {/* 折扣标签 */}
                              {activity.discount_percent && (
                                <div className="inline-block bg-accent text-white text-xs font-medium px-2 py-0.5 rounded-sm mb-1">
                                  {activity.discount_percent}% OFF
                                </div>
                              )}
                              <h4 className="text-sm font-medium text-text group-hover:text-accent transition-colors duration-300">
                                {getLocalizedText(activity.title, activity.title_en, activity.title_ar)}
                              </h4>
                              <p className="text-xs text-text-muted">
                                {getLocalizedText(activity.description, activity.description_en, activity.description_ar)}
                              </p>
                            </div>
                          </div>
                        </a>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="flex flex-col items-center space-x-3 flex-shrink-0 px-4 w-64">
                    <div className="text-center py-8">
                      <p className="text-sm text-text-muted">暂无活动</p>
                    </div>
                  </div>
                )}
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
    if (activityModules.length > 0) {
      return (
        <section className="bg-[var(--background)] py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="relative rounded-sm overflow-hidden shadow-xl h-[350px] md:h-[450px] mb-8 bg-white">
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
                    <div className="absolute inset-0 bg-gradient-to-t from-dark/90 to-transparent flex items-end">
                      <div className="p-8 text-white">
                        <h3 
                          className="text-2xl md:text-3xl font-bold mb-2"
                          style={{ fontFamily: 'Cormorant, serif' }}
                        >
                          {getLocalizedText(activity.title, activity.title_en, activity.title_ar)}
                        </h3>
                        <p className="text-base text-text-muted">
                          {getLocalizedText(activity.description, activity.description_en, activity.description_ar)}
                        </p>
                      </div>
                    </div>
                  </a>
                </div>
              ))}
              
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 z-10">
                {activityModules.map((activity, index) => (
                  <button
                    key={`activity-indicator-${activity.id}-${index}`}
                    onClick={() => setCurrentActivityIndex(index)}
                    className={`h-1 rounded-full transition-all duration-300 ${index === currentActivityIndex ? 'bg-accent w-10' : 'bg-border w-6'}`}
                  ></button>
                ))}
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
