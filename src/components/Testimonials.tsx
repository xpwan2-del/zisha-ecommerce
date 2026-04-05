"use client";

import { useTranslation } from "react-i18next";

export function Testimonials() {
  const { t } = useTranslation();
  const testimonials = t('testimonials.items', { returnObjects: true }) as any[];

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16 font-['Noto_Serif_TC'] text-[#450A0A]">{t('testimonials.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial: any, index: number) => (
            <div key={index} className="bg-[#FEF2F2] p-8 rounded-lg shadow-lg border border-[#7C2D12]/20 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 rounded-full bg-[#7C2D12]/20 flex items-center justify-center mr-4">
                  <span className="text-[#7C2D12] font-bold text-xl font-['Noto_Serif_TC']">{testimonial.name.charAt(0)}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-lg font-['Noto_Serif_TC'] text-[#450A0A]">{testimonial.name}</h4>
                  <p className="text-sm text-[#450A0A]/70 font-['Noto_Sans_TC']">{testimonial.location}</p>
                </div>
              </div>
              <p className="text-[#450A0A] font-['Noto_Sans_TC'] leading-relaxed">{testimonial.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}