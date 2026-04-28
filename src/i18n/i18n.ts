import i18next from "i18next";
import { initReactI18next } from "react-i18next";

// Initialize i18next
const i18n = i18next.createInstance();

// Load translations from local files as fallback
const fallbackTranslations = {
  en: require("./locales/en.json"),
  zh: require("./locales/zh.json"),
  ar: require("./locales/ar.json"),
};

// Function to load translations from database
async function loadTranslationsFromDatabase() {
  try {
    const response = await fetch('/api/translations');
    if (response.ok) {
      const data = await response.json();
      if (data && typeof data === 'object') {
        return data;
      }
    }
  } catch (error) {
    console.error('Error loading translations from database:', error);
  }
  return null;
}

i18n
  .use(initReactI18next)
  .init({
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

// Load translations from database and update i18n
loadTranslationsFromDatabase().then((dbTranslations) => {
  if (dbTranslations) {
    // Update i18n resources with database translations
    Object.keys(dbTranslations).forEach((lng) => {
      if (i18n.hasResourceBundle(lng, 'translation')) {
        const existingTranslations = i18n.getResourceBundle(lng, 'translation');
        const newTranslations = {
          ...existingTranslations,
          ...dbTranslations[lng],
        };
        i18n.addResourceBundle(lng, 'translation', newTranslations, true, true);
      }
    });
  }
});

export default i18n;
