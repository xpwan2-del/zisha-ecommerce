"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface ModuleConfig {
  id?: number;
  config_key: string;
  config_value: string;
  description: string;
}

const moduleLabels: Record<string, { zh: string; en: string; ar: string }> = {
  module_hero: { zh: "首页横幅", en: "Hero Banner", ar: "لافتة البطل" },
  module_categories: { zh: "产品分类", en: "Categories", ar: "الفئات" },
  module_featured_products: { zh: "精选产品", en: "Featured Products", ar: "المنتجات المميزة" },
  module_about: { zh: "关于我们", en: "About Us", ar: "معلومات عنا" },
  module_testimonials: { zh: "客户评价", en: "Testimonials", ar: "الشهادات" },
  module_contact: { zh: "联系我们", en: "Contact Us", ar: "اتصل بنا" },
  module_customize: { zh: "定制功能", en: "Customize", ar: "تخصيص" },
  module_lucky_draw: { zh: "一元购抽奖", en: "Lucky Draw", ar: "السحب المحظوظ" },
};

export default function ModuleManagement() {
  const { t, i18n } = useTranslation();
  const [configs, setConfigs] = useState<ModuleConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await fetch("/api/system-configs");
      const data = await response.json();
      
      const configArray = Object.entries(data).map(([key, value]) => ({
        config_key: key,
        config_value: value ? "true" : "false",
        description: moduleLabels[key]?.zh || key,
      }));
      
      setConfigs(configArray);
    } catch (error) {
      console.error("Error fetching configs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModule = async (configKey: string, currentValue: string) => {
    setSaving(configKey);
    const newValue = currentValue === "true" ? "false" : "true";
    
    try {
      const response = await fetch("/api/system-configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config_key: configKey,
          config_value: newValue,
        }),
      });

      if (response.ok) {
        setConfigs((prev) =>
          prev.map((config) =>
            config.config_key === configKey
              ? { ...config, config_value: newValue }
              : config
          )
        );
      }
    } catch (error) {
      console.error("Error updating config:", error);
    } finally {
      setSaving(null);
    }
  };

  const getModuleLabel = (key: string) => {
    const locale = i18n.language;
    return moduleLabels[key]?.[locale as "zh" | "en" | "ar"] || key;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amazon-orange"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          首页模块管理
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              模块开关控制
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              开启或关闭首页的各个功能模块，定制和一元购模块默认关闭
            </p>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {configs.map((config) => (
              <div
                key={config.config_key}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      config.config_value === "true"
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                    }`}
                  >
                    {config.config_key === "module_hero" && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    {config.config_key === "module_categories" && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    )}
                    {config.config_key === "module_featured_products" && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    )}
                    {config.config_key === "module_about" && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {config.config_key === "module_testimonials" && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    )}
                    {config.config_key === "module_contact" && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                    {config.config_key === "module_customize" && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    )}
                    {config.config_key === "module_lucky_draw" && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {getModuleLabel(config.config_key)}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {config.config_key}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleModule(config.config_key, config.config_value)}
                  disabled={saving === config.config_key}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amazon-orange focus:ring-offset-2 ${
                    config.config_value === "true"
                      ? "bg-amazon-orange"
                      : "bg-gray-200 dark:bg-gray-600"
                  } ${saving === config.config_key ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.config_value === "true" ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">使用说明</h4>
              <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• 开启模块后，首页将显示对应的功能区域</li>
                <li>• 关闭模块后，对应的功能区域将从首页隐藏</li>
                <li>• 定制功能和一元购抽奖默认关闭，需要手动开启</li>
                <li>• 修改后刷新首页即可看到效果</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
