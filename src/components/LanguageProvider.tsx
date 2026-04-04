"use client";

import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/i18n";
import { useEffect, useState } from "react";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('language');
    if (saved && ['en', 'zh', 'ar'].includes(saved)) {
      i18n.changeLanguage(saved);
    } else {
      const browserLang = navigator.language.split('-')[0];
      if (['en', 'zh', 'ar'].includes(browserLang)) {
        i18n.changeLanguage(browserLang);
      }
    }
    setReady(true);
  }, []);

  if (!ready) {
    return null;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}