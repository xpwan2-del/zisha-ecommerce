"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

export function About() {
  const { t } = useTranslation();
  const [activeImage, setActiveImage] = useState(0);
  
  // 关于我们数据
  const about = {
    title: '关于我们',
    description: '了解我们的紫砂工艺',
    images: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20pottery%20craftsman%20working%20on%20teapot%20traditional%20chinese%20craftsmanship%20professional%20photography&image_size=landscape_4_3',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapots%20display%20in%20shop%20elegant%20traditional%20chinese%20style&image_size=landscape_4_3',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20tea%20ceremony%20zisha%20teapot%20cultural%20heritage&image_size=landscape_4_3'
    ],
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    content: '我们的紫砂茶具由技艺精湛的工匠手工制作，采用代代相传的传统技艺。每件作品都是独一无二的，承载着中国文化和工艺的精髓。'
  };

  return (
    <section id="about" className="py-20 px-4 bg-[#FDF2F8] middle-east-pattern">
      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6 font-['Noto_Naskh_Arabic'] text-[#831843]">{about.title}</h2>
          <p className="text-lg text-[#831843] max-w-2xl mx-auto font-['Noto_Sans_Arabic']">{about.description}</p>
        </div>

        {/* Image Carousel */}
        {about.images && Array.isArray(about.images) && about.images.length > 0 && (
          <div className="mb-16">
            <div className="relative rounded-lg overflow-hidden shadow-xl glass-effect">
              <img 
                src={about.images[activeImage]} 
                alt={`关于我们 - ${activeImage + 1}`} 
                className="w-full h-[500px] object-cover transition-opacity duration-500"
              />
              {/* Image Indicators */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3">
                {about.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImage(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${activeImage === index ? 'bg-[#CA8A04] w-8' : 'bg-white/70'}`}
                  ></button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h3 className="text-3xl font-bold mb-6 font-['Noto_Naskh_Arabic'] text-[#831843]">我们的故事</h3>
            <p className="text-lg text-[#831843] mb-6 font-['Noto_Sans_Arabic']">
              {about.content}
            </p>
            <p className="text-lg text-[#831843] mb-8 font-['Noto_Sans_Arabic']">
              我们致力于传承传统的紫砂工艺，同时将其带给世界各地的现代茶爱好者。每件作品都由我们技艺精湛的工匠精心制作，他们经过多年的磨练，掌握了这门独特的工艺。
            </p>
            <button className="bg-[#CA8A04] hover:bg-[#B47C03] text-white px-8 py-4 rounded-md font-medium transition-all duration-300 transform hover:scale-105 font-['Noto_Sans_Arabic'] text-lg">
              {t('hero.cta')}
            </button>
          </div>
          <div className="space-y-6">
            {/* Feature Cards */}
            <div className="bg-white/80 glass-effect p-6 rounded-lg shadow-lg border border-[#DB2777]/20 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-start gap-4">
                <div className="bg-[#DB2777]/10 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#DB2777]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-2 font-['Noto_Naskh_Arabic'] text-[#831843]">正宗工艺</h4>
                  <p className="text-[#831843] font-['Noto_Sans_Arabic']">每件茶壶都由技艺精湛的工匠使用传统技艺手工制作。</p>
                </div>
              </div>
            </div>
            <div className="bg-white/80 glass-effect p-6 rounded-lg shadow-lg border border-[#DB2777]/20 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-start gap-4">
                <div className="bg-[#DB2777]/10 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#DB2777]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-2 font-['Noto_Naskh_Arabic'] text-[#831843]">优质材料</h4>
                  <p className="text-[#831843] font-['Noto_Sans_Arabic']">我们只使用从传统矿山采集的优质宜兴紫砂泥。</p>
                </div>
              </div>
            </div>
            <div className="bg-white/80 glass-effect p-6 rounded-lg shadow-lg border border-[#DB2777]/20 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-start gap-4">
                <div className="bg-[#DB2777]/10 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#DB2777]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-2 font-['Noto_Naskh_Arabic'] text-[#831843]">客户满意</h4>
                  <p className="text-[#831843] font-['Noto_Sans_Arabic']">我们致力于为客户提供最好的产品和服务。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}