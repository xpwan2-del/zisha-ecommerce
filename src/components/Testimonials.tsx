"use client";

import { useTranslation } from "react-i18next";

export function Testimonials() {
  const { t } = useTranslation();
  const testimonials = t('testimonials.items', { returnObjects: true }) as any[];

  return (
    <section className="py-20 px-4 bg-background middle-east-pattern">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16 font-['Noto_Naskh_Arabic'] text-text">{t('testimonials.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial: any, index: number) => (
            <div key={`testimonial-${testimonial.name}-${index}`} className="bg-white/80 glass-effect p-8 rounded-lg shadow-lg border border-accent/20 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mr-4">
                  <span className="text-accent font-bold text-xl font-['Noto_Naskh_Arabic']">{testimonial.name.charAt(0)}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-lg font-['Noto_Naskh_Arabic'] text-text">{testimonial.name}</h4>
                  <p className="text-sm text-text-muted font-['Noto_Sans_Arabic']">{testimonial.location}</p>
                </div>
              </div>
              <p className="text-text font-['Noto_Sans_Arabic'] leading-relaxed">{testimonial.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}