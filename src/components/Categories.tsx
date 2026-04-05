"use client";

import { useTranslation } from "react-i18next";

export function Categories() {
  const { t } = useTranslation();
  const categories = t('categories.items', { returnObjects: true }) as string[];

  const categoryImages = [
    "https://image.pollinations.ai/prompt/chinese%20zisha%20teapot%20collection?width=400&height=400&seed=cat1",
    "https://image.pollinations.ai/prompt/zisha%20tea%20cups%20set?width=400&height=400&seed=cat2",
    "https://image.pollinations.ai/prompt/tea%20accessories%20zisha?width=400&height=400&seed=cat3",
    "https://image.pollinations.ai/prompt/zisha%20tea%20set%20complete?width=400&height=400&seed=cat4"
  ];

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">{t('categories.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {categories.map((category: string, index: number) => (
            <div key={index} className="group">
              <div className="relative overflow-hidden rounded-lg aspect-square mb-4">
                <img 
                  src={categoryImages[index]} 
                  alt={category} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-dark/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="bg-white text-dark px-4 py-2 rounded-full font-medium">
                    {t('hero.cta')}
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-center">{category}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}