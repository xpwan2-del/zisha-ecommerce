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

export function HomeModules() {
  const { t, i18n } = useTranslation();
  const [modules, setModules] = useState<HomeModule[]>([]);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [guarantees, setGuarantees] = useState<any[]>([]);

  useEffect(() => {
    fetchModules();
    fetchGuarantees();
  }, []);

  const fetchGuarantees = async () => {
    try {
      const response = await fetch('/api/guarantees');
      if (response.ok) {
        const data = await response.json();
        setGuarantees(data.filter((g: any) => g.is_active));
      }
    } catch (error) {
      console.error('Error fetching guarantees:', error);
      // Use default guarantees if API fails
      setGuarantees([
        {
          id: 1,
          text: 'Free shipping on orders over $50',
          text_en: 'Free shipping on orders over $50',
          text_ar: 'شحن مجاني على الطلبات فوق 50 دولار',
          color: '#CA8A04',
          icon: 'check-circle',
          is_active: true,
          order: 0
        },
        {
          id: 2,
          text: '30-day returns',
          text_en: '30-day returns',
          text_ar: 'إرجاع في غضون 30 يومًا',
          color: '#CA8A04',
          icon: 'check-circle',
          is_active: true,
          order: 1
        },
        {
          id: 3,
          text: 'Authentic guarantee',
          text_en: 'Authentic guarantee',
          text_ar: 'ضمان أصالة',
          color: '#CA8A04',
          icon: 'check-circle',
          is_active: true,
          order: 2
        },
        {
          id: 4,
          text: 'Green product',
          text_en: 'Green product',
          text_ar: 'منتج أخضر',
          color: '#CA8A04',
          icon: 'check-circle',
          is_active: true,
          order: 3
        }
      ]);
    }
  };

  const fetchModules = async () => {
    try {
      const response = await fetch('/api/home-modules');
      if (response.ok) {
        const data = await response.json();
        setModules(data.filter((module: HomeModule) => module.is_active));
      } else {
        // 使用默认数据作为 fallback
        setModules([
          {
            id: 1,
            type: 'hero',
            title: '正宗紫砂陶艺',
            title_en: 'Authentic Zisha Pottery',
            title_ar: 'فخار زيشا الأصلي',
            description: '体验传统中国茶文化的艺术，我们的正宗紫砂陶艺由拥有数百年传承的大师工匠手工制作。',
            description_en: 'Experience the art of traditional Chinese tea culture. Our authentic Zisha pottery is handcrafted by master artisans with centuries of heritage.',
            description_ar: 'استمتع بفن ثقافة الشاي الصينية التقليدية. فخار زيشا الأصلي لدينا مصنوع يدويًا بواسطة حرفيين منقطعين ذوي تراث قرون.',
            image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20zisha%20teapot%20collection%20on%20wooden%20table%20with%20traditional%20chinese%20tea%20set%20elegant%20professional%20photography%20dark%20wood%20background&image_size=landscape_16_9',
            is_active: true,
            order: 0,
            button_text: '立即购买',
            button_text_en: 'Shop Now',
            button_text_ar: 'تسوق الآن',
            button_link: '/products',
            secondary_button_text: '探索系列',
            secondary_button_text_en: 'Explore Collection',
            secondary_button_text_ar: 'استكشف المجموعة',
            secondary_button_link: '/customize'
          },
          {
            id: 2,
            type: 'activity',
            title: '1元购活动',
            title_en: '1 Yuan Sale',
            title_ar: 'بيع 1 يوان',
            description: '精选紫砂壶，限时1元购',
            description_en: 'Selected Zisha teapots, limited time 1 Yuan sale',
            description_ar: 'فخار زيشا مختار، بيع 1 يوان لفترة محدودة',
            image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20promotion%20banner%201%20yuan%20sale%20chinese%20style%20elegant%20design&image_size=landscape_16_9',
            link: '/deals?type=1yuan',
            is_active: true,
            order: 1
          },
          {
            id: 3,
            type: 'activity',
            title: '今日特价',
            title_en: 'Daily Special',
            title_ar: 'عرض يومي',
            description: '每日精选，限时折扣',
            description_en: 'Daily selection, limited time discount',
            description_ar: 'اختيار يومي، خصم لفترة محدودة',
            image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20daily%20special%20offer%20banner%20chinese%20style%20elegant%20design&image_size=landscape_16_9',
            link: '/deals?type=daily',
            is_active: true,
            order: 2
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching home modules:', error);
      // 使用默认数据作为 fallback
      setModules([
        {
          id: 1,
          type: 'hero',
          title: '正宗紫砂陶艺',
          title_en: 'Authentic Zisha Pottery',
          title_ar: 'فخار زيشا الأصلي',
          description: '体验传统中国茶文化的艺术，我们的正宗紫砂陶艺由拥有数百年传承的大师工匠手工制作。',
          description_en: 'Experience the art of traditional Chinese tea culture. Our authentic Zisha pottery is handcrafted by master artisans with centuries of heritage.',
          description_ar: 'استمتع بفن ثقافة الشاي الصينية التقليدية. فخار زيشا الأصلي لدينا مصنوع يدويًا بواسطة حرفيين منقطعين ذوي تراث قرون.',
          image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20zisha%20teapot%20collection%20on%20wooden%20table%20with%20traditional%20chinese%20tea%20set%20elegant%20professional%20photography%20dark%20wood%20background&image_size=landscape_16_9',
          is_active: true,
          order: 0,
          button_text: '立即购买',
          button_text_en: 'Shop Now',
          button_text_ar: 'تسوق الآن',
          button_link: '/products',
          secondary_button_text: '探索系列',
          secondary_button_text_en: 'Explore Collection',
          secondary_button_text_ar: 'استكشف المجموعة',
          secondary_button_link: '/customize'
        },
        {
          id: 2,
          type: 'activity',
          title: '1元购活动',
          title_en: '1 Yuan Sale',
          title_ar: 'بيع 1 يوان',
          description: '精选紫砂壶，限时1元购',
          description_en: 'Selected Zisha teapots, limited time 1 Yuan sale',
          description_ar: 'فخار زيشا مختار، بيع 1 يوان لفترة محدودة',
          image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20promotion%20banner%201%20yuan%20sale%20chinese%20style%20elegant%20design&image_size=landscape_16_9',
          link: '/deals?type=1yuan',
          is_active: true,
          order: 1
        },
        {
          id: 3,
          type: 'activity',
          title: '今日特价',
          title_en: 'Daily Special',
          title_ar: 'عرض يومي',
          description: '每日精选，限时折扣',
          description_en: 'Daily selection, limited time discount',
          description_ar: 'اختيار يومي، خصم لفترة محدودة',
          image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20daily%20special%20offer%20banner%20chinese%20style%20elegant%20design&image_size=landscape_16_9',
          link: '/deals?type=daily',
          is_active: true,
          order: 2
        }
      ]);
    }
  };

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

  const getLocalizedText = (zh: string, en: string, ar: string) => {
    const locale = i18n.language;
    if (locale === 'zh') return zh;
    if (locale === 'en') return en;
    if (locale === 'ar') return ar;
    return zh;
  };

  const renderCombinedModules = (heroModule: HomeModule, activityModules: HomeModule[]) => {
    // 合并所有轮播项，包括Hero和活动
    const allSlides = [heroModule, ...activityModules];
    
    return (
      <section className="relative bg-[#FEF2F2] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
          {/* Combined Carousel */}
          <div className="relative rounded-lg overflow-hidden shadow-lg h-[350px] md:h-[450px] mb-6">
            {allSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${index === currentActivityIndex ? 'opacity-100' : 'opacity-0'}`}
              >
                {/* Hero slide */}
                {slide.type === 'hero' ? (
                  <div className="h-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center h-full p-6">
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-[#450A0A] leading-tight font-['Noto_Serif_TC']">
                            {getLocalizedText(slide.title, slide.title_en, slide.title_ar)}
                          </h1>
                          <p className="text-lg text-[#450A0A] leading-relaxed font-['Noto_Sans_TC']">
                            源自中国的顶级茶具
                          </p>
                        </div>
                        
                        <p className="text-base text-[#450A0A] leading-relaxed font-['Noto_Sans_TC']">
                          {getLocalizedText(slide.description, slide.description_en, slide.description_ar)}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          {slide.button_text && slide.button_link && (
                            <a 
                              href={slide.button_link} 
                              className="bg-[#CA8A04] hover:bg-[#B47C03] text-white font-medium py-3 px-6 rounded-md transition-colors duration-300 flex items-center justify-center text-lg"
                            >
                              {getLocalizedText(slide.button_text, slide.button_text_en || '', slide.button_text_ar || '')}
                            </a>
                          )}
                          {slide.secondary_button_text && slide.secondary_button_link && (
                            <a 
                              href={slide.secondary_button_link} 
                              className="border-2 border-[#7C2D12] hover:bg-[#7C2D12] hover:text-white text-[#450A0A] py-3 px-6 rounded-md font-medium transition-all duration-300 flex items-center justify-center text-lg"
                            >
                              {getLocalizedText(slide.secondary_button_text, slide.secondary_button_text_en || '', slide.secondary_button_text_ar || '')}
                            </a>
                          )}
                        </div>
                      </div>
                      
                      <div className="relative">
                        <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden shadow-2xl">
                          <img
                            src={slide.image}
                            alt={slide.title}
                            className="object-cover w-full h-full transition-transform duration-500 hover:scale-105"
                          />
                        </div>
                        {slide.button_text && (
                          <div className="absolute -bottom-4 -right-4 bg-[#CA8A04] text-white px-4 py-2 rounded-md shadow-lg font-bold font-['Noto_Serif_TC'] text-base">
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
                    <div className="absolute inset-0 bg-gradient-to-t from-[#450A0A]/80 to-transparent flex items-end">
                      <div className="p-6 text-white">
                        <h3 className="text-2xl md:text-3xl font-bold mb-2 font-['Noto_Serif_TC']">
                          {getLocalizedText(slide.title, slide.title_en, slide.title_ar)}
                        </h3>
                        <p className="text-base md:text-lg font-['Noto_Sans_TC']">
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
              {allSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentActivityIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentActivityIndex ? 'bg-[#CA8A04] w-8' : 'bg-white/70'}`}
                ></button>
              ))}
            </div>
          </div>
          
          {/* Scrolling service guarantees */}
          <div className="overflow-hidden">
            <div className="flex animate-scroll whitespace-nowrap">
              <div className="flex space-x-6 py-3">
                {guarantees.map((guarantee, index) => (
                  <div key={guarantee.id} className="flex items-center space-x-2 flex-shrink-0 px-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: guarantee.color }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-[#450A0A] font-['Noto_Sans_TC']">
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
                    <span className="text-sm text-[#450A0A] font-['Noto_Sans_TC']">
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
                  key={activity.id}
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
                {activityModules.map((_, index) => (
                  <button
                    key={index}
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
