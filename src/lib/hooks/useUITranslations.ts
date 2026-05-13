"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getTranslationResources, type TranslationResources } from "@/i18n/i18n";

interface TranslationCache {
  [key: string]: {
    zh: string;
    en: string;
    ar: string;
  };
}

const cache: TranslationCache = {};

function normalizeTranslationMap(data: TranslationResources): TranslationCache {
  const dbTranslations: TranslationCache = {};

  const languages: Array<keyof TranslationCache[string]> = ["zh", "en", "ar"];

  languages.forEach((lang) => {
    const languagePack = data[lang];
    if (!languagePack) {
      return;
    }

    Object.entries(languagePack).forEach(([namespace, values]) => {
      if (!values || typeof values !== "object") {
        return;
      }

      Object.entries(values).forEach(([key, value]) => {
        const fullKey = `${namespace}.${key}`;
        if (!dbTranslations[fullKey]) {
          dbTranslations[fullKey] = { zh: "", en: "", ar: "" };
        }
        dbTranslations[fullKey][lang] = typeof value === "string" ? value : "";
      });
    });
  });

  return dbTranslations;
}

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
        const data = await getTranslationResources();
        if (!data) {
          return;
        }

        const dbTranslations = normalizeTranslationMap(data);
        Object.assign(cache, dbTranslations);
        setTranslations(dbTranslations);
      } catch (error) {
        console.error("Failed to load UI translations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const cached = cache[key];
      if (cached) {
        if (currentLang === "zh") return cached.zh || fallback || key;
        if (currentLang === "ar") return cached.ar || cached.en || fallback || key;
        return cached.en || fallback || key;
      }
      return fallback || key;
    },
    [currentLang]
  );

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
