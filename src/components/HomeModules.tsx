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
      <section className="relative bg-[#FAFAF9] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-4 md:pt-20 md:pb-8">
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
                          <p className="text-sm text-[#CA8A04] tracking-widest uppercase font-medium">
                            源自中国的顶级茶具
                          </p>
                          <h1 
                            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#1C1917] leading-tight"
                            style={{ fontFamily: 'Cormorant, serif' }}
                          >
                            {getLocalizedText(slide.title, slide.title_en, slide.title_ar)}
                          </h1>
                        </div>
                        
                        <p className="text-base text-[#78716C] leading-relaxed max-w-lg">
                          {getLocalizedText(slide.description, slide.description_en, slide.description_ar)}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          {slide.button_text && slide.button_link && (
                            <a 
                              href={slide.button_link} 
                              className="bg-[#CA8A04] hover:bg-[#B47C03] text-white font-medium py-3 px-8 rounded-sm transition-all duration-300 flex items-center justify-center text-sm tracking-wide"
                              style={{ boxShadow: '0 4px 14px rgba(202, 138, 4, 0.3)' }}
                            >
                              {getLocalizedText(slide.button_text, slide.button_text_en || '', slide.button_text_ar || '')}
                            </a>
                          )}
                          {slide.secondary_button_text && slide.secondary_button_link && (
                            <a 
                              href={slide.secondary_button_link} 
                              className="border-2 border-[#1C1917] hover:bg-[#1C1917] hover:text-white text-[#1C1917] py-3 px-8 rounded-sm font-medium transition-all duration-300 flex items-center justify-center text-sm tracking-wide"
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
                            className="absolute -bottom-4 -right-4 bg-[#CA8A04] text-white px-5 py-2 rounded-sm shadow-lg font-medium text-sm tracking-wide"
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
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/90 to-transparent flex items-end">
                      <div className="p-8 text-white">
                        <h3 
                          className="text-2xl md:text-3xl font-bold mb-2"
                          style={{ fontFamily: 'Cormorant, serif' }}
                        >
                          {getLocalizedText(slide.title, slide.title_en, slide.title_ar)}
                        </h3>
                        <p className="text-base text-[#A8A29E]">
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
                  className={`h-1 rounded-full transition-all duration-300 ${index === currentActivityIndex ? 'bg-[#CA8A04] w-10' : 'bg-[#E7E5E4] w-6 hover:bg-[#CA8A04]/50'}`}
                ></button>
              ))}
            </div>
          </div>
          
          {/* Scrolling service guarantees - Luxury Style */}
          <div className="overflow-hidden bg-white rounded-sm shadow-sm border border-[#E7E5E4] p-5">
            <div className="flex animate-scroll whitespace-nowrap">
              <div className="flex space-x-10 py-2">
                {guarantees.map((guarantee) => (
                  <div key={guarantee.id} className="flex items-center space-x-3 flex-shrink-0 px-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#CA8A04' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-[#44403C] font-medium tracking-wide">
                      {getLocalizedText(guarantee.text, guarantee.text_en, guarantee.text_ar)}
                    </span>
                  </div>
                ))}
                {guarantees.map((guarantee) => (
                  <div key={`dup-${guarantee.id}`} className="flex items-center space-x-3 flex-shrink-0 px-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#CA8A04' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-[#44403C] font-medium tracking-wide">
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
    if (activityModules.length > 0) {
      return (
        <section className="bg-[#FAFAF9] py-8 px-4">
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
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/90 to-transparent flex items-end">
                      <div className="p-8 text-white">
                        <h3 
                          className="text-2xl md:text-3xl font-bold mb-2"
                          style={{ fontFamily: 'Cormorant, serif' }}
                        >
                          {getLocalizedText(activity.title, activity.title_en, activity.title_ar)}
                        </h3>
                        <p className="text-base text-[#A8A29E]">
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
                    className={`h-1 rounded-full transition-all duration-300 ${index === currentActivityIndex ? 'bg-[#CA8A04] w-10' : 'bg-[#E7E5E4] w-6'}`}
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
