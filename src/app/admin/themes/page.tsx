"use client";

import { useState, useEffect } from "react";
import { themes } from "@/styles/themes";

type ThemeKey = keyof typeof themes;

export default function ThemeSettings() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("chinese");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const response = await fetch("/api/themes");
        if (response.ok) {
          const data = await response.json();
          if (data.theme && Object.keys(themes).includes(data.theme)) {
            setSelectedTheme(data.theme as ThemeKey);
          }
        }
      } catch (error) {
        console.error("Failed to fetch theme:", error);
      }
    };

    fetchTheme();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/themes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ theme: selectedTheme }),
      });

      if (response.ok) {
        setMessage("主题配置保存成功！");
      } else {
        setMessage("保存失败，请重试");
      }
    } catch (error) {
      console.error("Failed to save theme:", error);
      setMessage("保存失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">主题配置</h1>
      
      {message && (
        <div className={`mb-4 p-4 rounded ${message.includes("成功") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(themes).map(([key, themeConfig]) => (
          <div
            key={key}
            className={`p-6 rounded-lg border ${selectedTheme === key ? "border-accent bg-accent/5" : "border-gray-200"} cursor-pointer transition-all`}
            onClick={() => setSelectedTheme(key as ThemeKey)}
          >
            <h3 className="text-xl font-semibold mb-4">{themeConfig.name}</h3>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: themeConfig.colors.primary }} title="主色"></div>
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: themeConfig.colors.secondary }} title="辅助色"></div>
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: themeConfig.colors.accent }} title="强调色"></div>
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: themeConfig.colors.background }} title="背景色"></div>
            </div>
            
            <div className="mb-4">
              <button 
                className="btn-primary"
                style={{ 
                  background: themeConfig.components.buttons.primary.default.background,
                  borderColor: themeConfig.components.buttons.primary.default.border,
                  color: themeConfig.components.buttons.primary.default.text,
                  boxShadow: themeConfig.components.buttons.primary.default.boxShadow,
                  borderRadius: themeConfig.components.buttons.primary.default.borderRadius
                }}
              >
                按钮示例
              </button>
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <div 
                className="loading-spinner" 
                style={{ 
                  borderColor: themeConfig.colors.border,
                  borderTopColor: themeConfig.components.loading.color
                }}
              ></div>
              <span className="text-sm text-muted">{themeConfig.components.loading.style}</span>
            </div>
            
            <p className="text-sm text-muted">
              图案: {themeConfig.designElements.patterns.join(", ")}
            </p>
            <p className="text-sm text-muted mt-1">
              装饰: {themeConfig.designElements.decorations.join(", ")}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? "保存中..." : "保存主题配置"}
        </button>
      </div>
    </div>
  );
}
