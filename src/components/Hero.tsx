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

export function Hero() {
  const { t, i18n } = useTranslation();
  const [heroModule, setHeroModule] = useState<HomeModule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHeroModule();
  }, []);

  const fetchHeroModule = async () => {
    try {
      const response = await fetch('/api/home-modules');
      if (response.ok) {
        const modules = await response.json();
        const hero = modules.find((module: HomeModule) => module.type === 'hero' && module.is_active);
        setHeroModule(hero || null);
      }
    } catch (error) {
      console.error('Error fetching hero module:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !heroModule) {
    // 使用默认数据作为 fallback
    return (
      <section className="relative bg-[#FEF2F2] py-20 md:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[#450A0A] leading-tight font-['Noto_Serif_TC']">
                  {t('hero.title')}
                </h1>
                <p className="text-xl md:text-2xl text-[#450A0A] font-['Noto_Sans_TC']">
                  {t('hero.subtitle')}
                </p>
              </div>
              
              <p className="text-base text-[#450A0A] leading-relaxed font-['Noto_Sans_TC']">
                {t('hero.description')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="/products" 
                  className="bg-[#CA8A04] hover:bg-[#B47C03] text-white font-medium py-4 px-8 rounded-md transition-colors duration-300 flex items-center justify-center text-lg"
                >
                  {t('hero.cta')}
                </a>
                <a 
                  href="/customize" 
                  className="border-2 border-[#7C2D12] hover:bg-[#7C2D12] hover:text-white text-[#450A0A] py-4 px-8 rounded-md font-medium transition-all duration-300 flex items-center justify-center text-lg"
                >
                  {t('hero.explore')}
                </a>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden shadow-2xl">
                <img
                  src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20zisha%20teapot%20collection%20on%20wooden%20table%20with%20traditional%20chinese%20tea%20set%20elegant%20professional%20photography%20dark%20wood%20background&image_size=landscape_16_9"
                  alt="Zisha Pottery Collection"
                  className="object-cover w-full h-full transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-[#CA8A04] text-white px-6 py-3 rounded-md shadow-lg font-bold font-['Noto_Serif_TC'] text-lg">
                {t('hero.cta')}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const getLocalizedText = (zh: string, en: string, ar: string) => {
    const locale = i18n.language;
    if (locale === 'zh') return zh;
    if (locale === 'en') return en;
    if (locale === 'ar') return ar;
    return zh;
  };

  return (
    <section className="relative bg-[#FEF2F2] py-20 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[#450A0A] leading-tight font-['Noto_Serif_TC']">
                {getLocalizedText(heroModule.title, heroModule.title_en, heroModule.title_ar)}
              </h1>
            </div>
            
            <p className="text-base text-[#450A0A] leading-relaxed font-['Noto_Sans_TC']">
              {getLocalizedText(heroModule.description, heroModule.description_en, heroModule.description_ar)}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {heroModule.button_text && heroModule.button_link && (
                <a 
                  href={heroModule.button_link} 
                  className="bg-[#CA8A04] hover:bg-[#B47C03] text-white font-medium py-4 px-8 rounded-md transition-colors duration-300 flex items-center justify-center text-lg"
                >
                  {getLocalizedText(heroModule.button_text, heroModule.button_text_en || '', heroModule.button_text_ar || '')}
                </a>
              )}
              {heroModule.secondary_button_text && heroModule.secondary_button_link && (
                <a 
                  href={heroModule.secondary_button_link} 
                  className="border-2 border-[#7C2D12] hover:bg-[#7C2D12] hover:text-white text-[#450A0A] py-4 px-8 rounded-md font-medium transition-all duration-300 flex items-center justify-center text-lg"
                >
                  {getLocalizedText(heroModule.secondary_button_text, heroModule.secondary_button_text_en || '', heroModule.secondary_button_text_ar || '')}
                </a>
              )}
            </div>
          </div>
          
          <div className="relative">
            <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden shadow-2xl">
              <img
                src={heroModule.image}
                alt={heroModule.title}
                className="object-cover w-full h-full transition-transform duration-500 hover:scale-105"
              />
            </div>
            {heroModule.button_text && (
              <div className="absolute -bottom-6 -right-6 bg-[#CA8A04] text-white px-6 py-3 rounded-md shadow-lg font-bold font-['Noto_Serif_TC'] text-lg">
                {getLocalizedText(heroModule.button_text, heroModule.button_text_en || '', heroModule.button_text_ar || '')}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}