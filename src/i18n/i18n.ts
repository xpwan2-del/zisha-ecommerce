import i18next from "i18next";
import { initReactI18next } from "react-i18next";

const fallbackTranslations = {
  en: require("./locales/en.json"),
  zh: require("./locales/zh.json"),
  ar: require("./locales/ar.json"),
};

const i18n = i18next.createInstance();

i18n
  .use(initReactI18next)
  .init({
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "zh", "ar"],
    resources: {
      en: { translation: fallbackTranslations.en },
      zh: { translation: fallbackTranslations.zh },
      ar: { translation: fallbackTranslations.ar },
    },
    interpolation: {
      escapeValue: false,
    },
    ns: ['translation'],
    defaultNS: 'translation',
  });

export default i18n;