"use client";

import { I18nextProvider, initReactI18next } from "react-i18next";
import { useEffect, useState } from "react";
import i18next from "i18next";
import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';
import ar from '@/i18n/locales/ar.json';

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  ar: { translation: ar },
};

function getInitialLanguage(): string {
  if (typeof window === 'undefined') return 'en';

  const saved = localStorage.getItem('language');
  if (saved && ['en', 'zh', 'ar'].includes(saved)) {
    return saved;
  }

  const browserLang = navigator.language.split('-')[0];
  if (['en', 'zh', 'ar'].includes(browserLang)) {
    return browserLang;
  }

  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const initialLang = getInitialLanguage();

      await i18next
        .use(initReactI18next)
        .init({
          resources,
          lng: initialLang,
          fallbackLng: 'en',
          supportedLngs: ['en', 'zh', 'ar'],
          interpolation: {
            escapeValue: false,
          },
        });

      setIsReady(true);
    };

    init();
  }, []);

  if (!isReady) {
    return null;
  }

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}