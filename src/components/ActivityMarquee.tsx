"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';

interface Activity {
  id: number;
  title: string;
  title_en: string;
  title_ar: string;
  description: string;
  description_en: string;
  description_ar: string;
  image: string;
  link: string;
  is_active: boolean;
}

interface ActivityMarqueeProps {
  activities: Activity[];
}

export function ActivityMarquee({ activities }: ActivityMarqueeProps) {
  const { t, i18n } = useTranslation();

  const getLocalizedText = (zh: string, en: string, ar: string) => {
    const locale = i18n.language;
    if (locale === 'zh') return zh;
    if (locale === 'en') return en;
    if (locale === 'ar') return ar;
    return zh;
  };

  if (!activities || activities.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden bg-white rounded-sm shadow-sm border border-[#E7E5E4] p-5 my-8">
      <h3 className="text-lg font-medium text-[#1C1917] mb-4">平台活动</h3>
      <div className="flex animate-scroll whitespace-nowrap">
        <div className="flex space-x-6 py-2">
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className="flex flex-col items-center space-x-3 flex-shrink-0 px-4 w-64"
            >
              <a href={activity.link || '#'} className="block w-full">
                <div className="aspect-w-4 aspect-h-3 rounded-sm overflow-hidden shadow-md mb-3">
                  <img
                    src={activity.image}
                    alt={activity.title}
                    className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <h4 className="text-sm font-medium text-[#1C1917] mb-1 text-center">
                  {getLocalizedText(activity.title, activity.title_en, activity.title_ar)}
                </h4>
                <p className="text-xs text-[#78716C] text-center">
                  {getLocalizedText(activity.description, activity.description_en, activity.description_ar)}
                </p>
              </a>
            </div>
          ))}
          {/* 重复一次活动列表，使滚动更流畅 */}
          {activities.map((activity) => (
            <div 
              key={`dup-${activity.id}`} 
              className="flex flex-col items-center space-x-3 flex-shrink-0 px-4 w-64"
            >
              <a href={activity.link || '#'} className="block w-full">
                <div className="aspect-w-4 aspect-h-3 rounded-sm overflow-hidden shadow-md mb-3">
                  <img
                    src={activity.image}
                    alt={activity.title}
                    className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <h4 className="text-sm font-medium text-[#1C1917] mb-1 text-center">
                  {getLocalizedText(activity.title, activity.title_en, activity.title_ar)}
                </h4>
                <p className="text-xs text-[#78716C] text-center">
                  {getLocalizedText(activity.description, activity.description_en, activity.description_ar)}
                </p>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
