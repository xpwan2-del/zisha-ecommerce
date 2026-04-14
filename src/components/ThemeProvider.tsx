"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { themes } from "@/styles/themes";

type ThemeKey = keyof typeof themes;

interface ThemeContextType {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  themeConfig: typeof themes[ThemeKey];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 初始为null，等待API返回主题后再渲染
  const [theme, setTheme] = useState<ThemeKey | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 客户端渲染标志
    setIsClient(true);
    
    // 清除本地存储中的旧主题值
    localStorage.removeItem("theme");
    
    const fetchTheme = async () => {
      try {
        const response = await fetch("/api/themes");
        if (response.ok) {
          const data = await response.json();
          if (data.theme && themes[data.theme as ThemeKey]) {
            setTheme(data.theme as ThemeKey);
          }
        }
      } catch (error) {
        console.error("Failed to fetch theme:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTheme();
    
    // 定时检查主题变化（每24小时）
    const interval = setInterval(fetchTheme, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isClient && theme) {
      updateCSSVariables();
    }
  }, [theme, isClient]);

  const updateCSSVariables = () => {
    if (!theme) return;
    
    const themeConfig = themes[theme];
    const root = document.documentElement;

    root.style.setProperty("--primary", themeConfig.colors.primary);
    root.style.setProperty("--secondary", themeConfig.colors.secondary);
    root.style.setProperty("--accent", themeConfig.colors.accent);
    root.style.setProperty("--dark", themeConfig.colors.dark);
    root.style.setProperty("--light", themeConfig.colors.light);
    root.style.setProperty("--background", themeConfig.colors.background);
    root.style.setProperty("--background-alt", themeConfig.colors.backgroundAlt);
    root.style.setProperty("--text", themeConfig.colors.text);
    root.style.setProperty("--text-muted", themeConfig.colors.textMuted);
    root.style.setProperty("--border", themeConfig.colors.border);
    root.style.setProperty("--card", themeConfig.colors.card);
    root.style.setProperty("--primary-rgb", themeConfig.colors.primaryRgb);
    root.style.setProperty("--accent-rgb", themeConfig.colors.accentRgb);
    root.style.setProperty("--border-rgb", themeConfig.colors.borderRgb);
    root.style.setProperty("--heading-font", themeConfig.fonts.heading);
    root.style.setProperty("--body-font", themeConfig.fonts.body);
    root.style.setProperty("--btn-primary-bg", themeConfig.components.buttons.primary.default.background);
    root.style.setProperty("--btn-primary-text", themeConfig.components.buttons.primary.default.text);
    root.style.setProperty("--btn-primary-border", themeConfig.components.buttons.primary.default.border);
    root.style.setProperty("--btn-primary-shadow", themeConfig.components.buttons.primary.default.boxShadow);
    root.style.setProperty("--btn-primary-hover-bg", themeConfig.components.buttons.primary.hover.background);
    root.style.setProperty("--btn-primary-hover-text", themeConfig.components.buttons.primary.hover.text);
    root.style.setProperty("--btn-primary-hover-border", themeConfig.components.buttons.primary.hover.border);
    root.style.setProperty("--btn-primary-hover-transform", themeConfig.components.buttons.primary.hover.transform);
    root.style.setProperty("--btn-primary-hover-shadow", themeConfig.components.buttons.primary.hover.boxShadow);
    root.style.setProperty("--loading-color", themeConfig.components.loading.color);
  };

  // 加载时显示旋转圆圈
  const LoadingSpinner = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-gray-300 border-t-[var(--loading-color)] rounded-full animate-spin"></div>
    </div>
  );

  // 等待主题加载完成，或者正在加载时显示loading
  if (isLoading || !theme) {
    return isLoading ? <LoadingSpinner /> : (
      <ThemeContext.Provider value={{ theme: "chinese" as ThemeKey, setTheme: (t) => setTheme(t), themeConfig: themes["chinese"] }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeConfig: themes[theme] }}>
      <div className={`theme-${theme}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}