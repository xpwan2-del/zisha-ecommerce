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
  discount_percent?: number;
  type?: string;
}

interface ActivityMarqueeProps {
  activities: Activity[];
}

// 活动图标映射
const activityIcons: Record<string, string> = {
  'daily': '/images/icons/promotion-daily.svg',
  'special': '/images/icons/promotion-special.svg',
  'category': '/images/icons/promotion-category.svg',
  'product': '/images/icons/promotion-product.svg',
  'default': '/images/icons/promotion-daily.svg'
};

// 根据活动类型获取图标
const getActivityIcon = (type?: string) => {
  return activityIcons[type || 'default'] || activityIcons.default;
};

export function ActivityMarquee({ activities }: ActivityMarqueeProps) {
  const { t, i18n } = useTranslation();

  const getLocalizedText = (zh: string, en: string, ar: string) => {
    const locale = i18n.language;
    if (locale === 'zh') return zh;
    if (locale === 'en') return en;
    if (locale === 'ar') return ar;
    return zh;
  };

  return (
    <div className="overflow-hidden bg-white rounded-sm shadow-sm border border-border p-5 trae-browser-inspect-draggable">
      <h3 className="text-lg font-medium text-dark mb-4">平台活动</h3>
      <div className="flex animate-scroll whitespace-nowrap">
        <div className="flex space-x-10 py-2">
          {activities && activities.length > 0 ? (
            <>
              {activities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex flex-col items-center space-x-3 flex-shrink-0 px-4 w-64"
                >
                  <a href={activity.link || '#'} className="block w-full group">
                    <div className="relative aspect-w-4 aspect-h-3 rounded-sm overflow-hidden shadow-md mb-3">
                      <img
                        src={activity.image}
                        alt={activity.title}
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* 活动图标 */}
                      <div className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md">
                        <img 
                          src={getActivityIcon(activity.type)} 
                          alt="Activity icon" 
                          className="w-6 h-6"
                        />
                      </div>
                      {/* 折扣标签 */}
                      {activity.discount_percent && (
                        <div className="absolute top-2 left-2 bg-accent text-white text-xs font-medium px-2 py-1 rounded-sm">
                          {activity.discount_percent}% OFF
                        </div>
                      )}
                    </div>
                    <h4 className="text-sm font-medium text-dark mb-1 text-center group-hover:text-accent transition-colors duration-300">
                      {getLocalizedText(activity.title, activity.title_en, activity.title_ar)}
                    </h4>
                    <p className="text-xs text-text-muted text-center">
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
                  <a href={activity.link || '#'} className="block w-full group">
                    <div className="relative aspect-w-4 aspect-h-3 rounded-sm overflow-hidden shadow-md mb-3">
                      <img
                        src={activity.image}
                        alt={activity.title}
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* 活动图标 */}
                      <div className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md">
                        <img 
                          src={getActivityIcon(activity.type)} 
                          alt="Activity icon" 
                          className="w-6 h-6"
                        />
                      </div>
                      {/* 折扣标签 */}
                      {activity.discount_percent && (
                        <div className="absolute top-2 left-2 bg-accent text-white text-xs font-medium px-2 py-1 rounded-sm">
                          {activity.discount_percent}% OFF
                        </div>
                      )}
                    </div>
                    <h4 className="text-sm font-medium text-dark mb-1 text-center group-hover:text-accent transition-colors duration-300">
                      {getLocalizedText(activity.title, activity.title_en, activity.title_ar)}
                    </h4>
                    <p className="text-xs text-text-muted text-center">
                      {getLocalizedText(activity.description, activity.description_en, activity.description_ar)}
                    </p>
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
  );
}
