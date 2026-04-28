"use client";

import { useState, useEffect } from "react";

type ThemeKey = "chinese" | "middleEastern" | "amazon" | "middleEasternLuxury";

interface ThemeInfo {
  name: string;
}

export default function ThemeSettings() {
  const [themes, setThemes] = useState<Record<string, ThemeInfo>>({});
  const [themeColors, setThemeColors] = useState<Record<string, Record<string, string>>>({});
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("chinese");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchThemes();
    fetchColors();
  }, []);

  const fetchThemes = async () => {
    try {
      const response = await fetch("/api/theme-colors/themes");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setThemes(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch themes:", error);
    }
  };

  const fetchColors = async () => {
    try {
      const response = await fetch("/api/theme-colors");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setThemeColors(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch colors:", error);
    }
  };

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

  const getThemeDisplayInfo = (themeKey: string) => {
    const colors = themeColors[themeKey] || {};
    return {
      primary: colors.primary || "#1A237E",
      secondary: colors.secondary || "#D4AF37",
      accent: colors.accent || "#5D3B6D",
      background: colors.background || "#F9F5E9",
      border: colors.border || "#E5E7EB",
      loadingColor: colors["loading-color"] || "#1A237E",
      btnPrimaryBg: colors["btn-primary-bg"] || "#1A237E",
      btnPrimaryText: colors["btn-primary-text"] || "#FFFFFF",
      btnPrimaryBorder: colors["btn-primary-border"] || "#D4AF37",
      btnPrimaryShadow: colors["btn-primary-shadow"] || "0 4px 14px rgba(0,0,0,0.3)",
    };
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
        {Object.entries(themes).map(([key, themeInfo]) => {
          const displayInfo = getThemeDisplayInfo(key);
          return (
            <div
              key={key}
              className={`p-6 rounded-lg border ${selectedTheme === key ? "border-accent bg-accent/5" : "border-gray-200"} cursor-pointer transition-all`}
              onClick={() => setSelectedTheme(key as ThemeKey)}
            >
              <h3 className="text-xl font-semibold mb-4">{themeInfo.name}</h3>

              <div className="flex flex-wrap gap-2 mb-4">
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: displayInfo.primary }} title="主色"></div>
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: displayInfo.secondary }} title="辅助色"></div>
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: displayInfo.accent }} title="强调色"></div>
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: displayInfo.background }} title="背景色"></div>
              </div>

              <div className="mb-4">
                <button
                  className="btn-primary"
                  style={{
                    background: displayInfo.btnPrimaryBg,
                    borderColor: displayInfo.btnPrimaryBorder,
                    color: displayInfo.btnPrimaryText,
                    boxShadow: displayInfo.btnPrimaryShadow,
                    borderRadius: "4px"
                  }}
                >
                  按钮示例
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div
                  className="loading-spinner"
                  style={{
                    borderColor: displayInfo.border,
                    borderTopColor: displayInfo.loadingColor
                  }}
                ></div>
                <span className="text-sm text-muted">加载动画</span>
              </div>
            </div>
          );
        })}
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
