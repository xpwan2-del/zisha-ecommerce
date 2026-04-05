"use client";

import { useState, useEffect } from "react";
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

export function ActivityCarousel() {
  const { t, i18n } = useTranslation();
  const [activities, setActivities] = useState<HomeModule[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/home-modules');
      if (response.ok) {
        const modules = await response.json();
        const activityModules = modules.filter((module: HomeModule) => module.type === 'activity' && module.is_active);
        setActivities(activityModules);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  // 自动轮播
  useEffect(() => {
    setIsVisible(true);
    if (activities.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % activities.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activities.length]);

  const getLocalizedText = (zh: string, en: string, ar: string) => {
    const locale = i18n.language;
    if (locale === 'zh') return zh;
    if (locale === 'en') return en;
    if (locale === 'ar') return ar;
    return zh;
  };

  const renderCarousel = (activityModules: HomeModule[]) => {
    return (
      <section className={`py-8 px-4 bg-white transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-lg overflow-hidden shadow-lg h-[300px] md:h-[400px] mb-8">
            {activityModules.map((activity, index) => (
              <div
                key={activity.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
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
              {activityModules.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentIndex ? 'bg-[#CA8A04] w-8' : 'bg-white/70'}`}
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
  };

  if (activities.length === 0) {
    // 使用默认数据作为 fallback
    const defaultActivities: HomeModule[] = [
      {
        id: 1,
        type: 'activity',
        title: "1元购活动",
        title_en: "1 Yuan Sale",
        title_ar: "بيع 1 يوان",
        description: "精选紫砂壶，限时1元购",
        description_en: "Selected Zisha teapots, limited time 1 Yuan sale",
        description_ar: "فخار زيشا مختار، بيع 1 يوان لفترة محدودة",
        image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20promotion%20banner%201%20yuan%20sale%20chinese%20style%20elegant%20design&image_size=landscape_16_9",
        link: "/deals?type=1yuan",
        is_active: true,
        order: 1
      },
      {
        id: 2,
        type: 'activity',
        title: "今日特价",
        title_en: "Daily Special",
        title_ar: "عرض يومي",
        description: "每日精选，限时折扣",
        description_en: "Daily selection, limited time discount",
        description_ar: "اختيار يومي، خصم لفترة محدودة",
        image: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20daily%20special%20offer%20banner%20chinese%20style%20elegant%20design&image_size=landscape_16_9",
        link: "/deals?type=daily",
        is_active: true,
        order: 2
      }
    ];
    return renderCarousel(defaultActivities);
  }

  return renderCarousel(activities);
}
