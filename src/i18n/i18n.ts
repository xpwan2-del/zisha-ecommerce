import i18next from "i18next";
import { initReactI18next } from "react-i18next";

const i18n = i18next.createInstance();

const fallbackTranslations = {
  en: require("./locales/en.json"),
  zh: require("./locales/zh.json"),
  ar: require("./locales/ar.json"),
};

export type TranslationResources = Record<string, Record<string, Record<string, string>>>;

let translationResourcesCache: TranslationResources | null = null;
let translationResourcesPromise: Promise<TranslationResources | null> | null = null;

export async function getTranslationResources(): Promise<TranslationResources | null> {
  if (translationResourcesCache) {
    return translationResourcesCache;
  }

  if (typeof window === "undefined") {
    return null;
  }

  if (!translationResourcesPromise) {
    translationResourcesPromise = fetch("/api/translations")
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        if (!data || typeof data !== "object") {
          return null;
        }

        translationResourcesCache = data as TranslationResources;
        return translationResourcesCache;
      })
      .catch((error) => {
        console.error("Error loading translations from database:", error);
        return null;
      })
      .finally(() => {
        translationResourcesPromise = null;
      });
  }

  return translationResourcesPromise;
}

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  supportedLngs: ["en", "zh", "ar"],
  resources: {
    en: {
      translation: fallbackTranslations.en,
    },
    zh: {
      translation: fallbackTranslations.zh,
    },
    ar: {
      translation: fallbackTranslations.ar,
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

if (typeof window !== "undefined") {
  getTranslationResources().then((dbTranslations) => {
    if (!dbTranslations) {
      return;
    }

    Object.keys(dbTranslations).forEach((lng) => {
      if (!i18n.hasResourceBundle(lng, "translation")) {
        return;
      }

      const existingTranslations = i18n.getResourceBundle(lng, "translation");
      const nextTranslations = {
        ...existingTranslations,
        ...dbTranslations[lng],
      };

      i18n.addResourceBundle(lng, "translation", nextTranslations, true, true);
    });
  });
}

export default i18n;
