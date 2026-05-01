"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

interface TranslationCache {
  [key: string]: {
    zh: string;
    en: string;
    ar: string;
  };
}

const cache: TranslationCache = {};

export function useUITranslations() {
  const { i18n } = useTranslation();
  const [translations, setTranslations] = useState<TranslationCache>({});
  const [isLoading, setIsLoading] = useState(false);

  const currentLang = i18n.language || "zh";

  useEffect(() => {
    const loadTranslations = async () => {
      if (Object.keys(cache).length > 0) {
        setTranslations(cache);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch("/api/translations");
        if (response.ok) {
          const data = await response.json();

          const dbTranslations: TranslationCache = {};

          if (data.zh) {
            Object.entries(data.zh).forEach(([namespace, values]: [string, any]) => {
              if (typeof values === "object") {
                Object.entries(values).forEach(([key, value]: [string, any]) => {
                  const fullKey = `${namespace}.${key}`;
                  if (!dbTranslations[fullKey]) {
                    dbTranslations[fullKey] = { zh: "", en: "", ar: "" };
                  }
                  dbTranslations[fullKey].zh = value;
                });
              }
            });
          }

          if (data.en) {
            Object.entries(data.en).forEach(([namespace, values]: [string, any]) => {
              if (typeof values === "object") {
                Object.entries(values).forEach(([key, value]: [string, any]) => {
                  const fullKey = `${namespace}.${key}`;
                  if (!dbTranslations[fullKey]) {
                    dbTranslations[fullKey] = { zh: "", en: "", ar: "" };
                  }
                  dbTranslations[fullKey].en = value;
                });
              }
            });
          }

          if (data.ar) {
            Object.entries(data.ar).forEach(([namespace, values]: [string, any]) => {
              if (typeof values === "object") {
                Object.entries(values).forEach(([key, value]: [string, any]) => {
                  const fullKey = `${namespace}.${key}`;
                  if (!dbTranslations[fullKey]) {
                    dbTranslations[fullKey] = { zh: "", en: "", ar: "" };
                  }
                  dbTranslations[fullKey].ar = value;
                });
              }
            });
          }

          Object.assign(cache, dbTranslations);
          setTranslations(dbTranslations);
        }
      } catch (error) {
        console.error("Failed to load UI translations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    const cached = cache[key];
    if (cached) {
      if (currentLang === "zh") return cached.zh || fallback || key;
      if (currentLang === "ar") return cached.ar || cached.en || fallback || key;
      return cached.en || fallback || key;
    }
    return fallback || key;
  }, [currentLang]);

  return { t, translations, isLoading };
}

export function getUITranslation(key: string, lang: string, fallback?: string): string {
  const cached = cache[key];
  if (cached) {
    if (lang === "zh") return cached.zh || fallback || key;
    if (lang === "ar") return cached.ar || cached.en || fallback || key;
    return cached.en || fallback || key;
  }
  return fallback || key;
}
