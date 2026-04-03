import i18next from "i18next";
import { initReactI18next } from "react-i18next";

// 从API获取翻译数据
async function fetchTranslations(language: string) {
  try {
    const response = await fetch(`/api/translations/fetch?language=${language}`);
    if (response.ok) {
      return await response.json();
    }
    // 如果API失败，回退到本地文件
    return require(`./locales/${language}.json`);
  } catch (error) {
    console.error('Error fetching translations:', error);
    // 回退到本地文件
    return require(`./locales/${language}.json`);
  }
}

// 初始化i18next
const i18n = i18next.createInstance();

// 初始化函数
export async function initI18n() {
  const resources: any = {};
  
  // 预加载所有语言的翻译
  const languages = ['en', 'zh', 'ar'];
  for (const lang of languages) {
    resources[lang] = {
      translation: await fetchTranslations(lang)
    };
  }

  await i18n
    .use(initReactI18next)
    .init({
      lng: "en",
      fallbackLng: "en",
      supportedLngs: languages,
      resources,
      interpolation: {
        escapeValue: false,
      },
    });

  return i18n;
}

export default i18n;
