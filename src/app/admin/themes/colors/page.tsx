"use client";

import { useState, useEffect } from "react";

type ThemeKey = "chinese" | "middleEastern" | "amazon" | "middleEasternLuxury";

interface ThemeInfo {
  name: string;
}

interface ConfigItem {
  config_key: string;
  config_value: string;
  description: string;
}

interface ThemeColors {
  [key: string]: string;
}

const GROUP_ORDER = [
  { key: "colors", label: "颜色配置", pattern: ["primary", "secondary", "accent", "dark", "light", "background", "backgroundAlt", "text", "textMuted", "border", "card"] },
  { key: "status_colors", label: "状态颜色", pattern: ["colorRed", "colorGreen", "colorBlue", "colorYellow", "colorOrange"] },
  { key: "inventory", label: "库存状态", pattern: ["inventoryStatus"] },
  { key: "buttons", label: "按钮样式", pattern: ["btn-primary", "btn-secondary"] },
  { key: "fonts", label: "字体配置", pattern: ["heading-font", "body-font"] },
  { key: "loading", label: "加载动画", pattern: ["loading-color"] },
];

const getGroupForKey = (key: string): string => {
  for (const group of GROUP_ORDER) {
    for (const pattern of group.pattern) {
      if (key.startsWith(pattern)) {
        return group.key;
      }
    }
  }
  return "other";
};

const isColorValue = (value: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(value) || /^#[0-9A-Fa-f]{3}$/.test(value);
};

const isFontValue = (key: string): boolean => {
  return key.includes("font");
};

export default function ThemeColorsPage() {
  const [themes, setThemes] = useState<Record<string, ThemeInfo>>({});
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("chinese");
  const [allColors, setAllColors] = useState<Record<string, ThemeColors>>({});
  const [editedColors, setEditedColors] = useState<Record<string, ThemeColors>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchThemes();
    fetchAllColors();
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

  const fetchAllColors = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/theme-colors");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAllColors(data.data);
          setEditedColors(JSON.parse(JSON.stringify(data.data)));
        }
      }
    } catch (error) {
      console.error("Failed to fetch colors:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = (theme: ThemeKey) => {
    setSelectedTheme(theme);
  };

  const handleColorChange = (key: string, value: string) => {
    setEditedColors((prev) => ({
      ...prev,
      [selectedTheme]: {
        ...prev[selectedTheme],
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    try {
      const themeColors = editedColors[selectedTheme];
      if (!themeColors) return;

      const originalColors = allColors[selectedTheme] || {};
      let savedCount = 0;

      for (const [key, value] of Object.entries(themeColors)) {
        if (originalColors[key] !== value) {
          const response = await fetch("/api/theme-colors", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              theme_key: selectedTheme,
              config_key: key,
              config_value: value,
            }),
          });

          if (response.ok) {
            savedCount++;
          }
        }
      }

      if (savedCount > 0) {
        setAllColors(JSON.parse(JSON.stringify(editedColors)));
        setMessage(`成功保存 ${savedCount} 个配置！`);
      } else {
        setMessage("没有需要保存的修改");
      }
    } catch (error) {
      console.error("Failed to save colors:", error);
      setMessage("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const getGroupedConfigs = () => {
    const themeColors = editedColors[selectedTheme] || {};
    const groups: Record<string, ConfigItem[]> = {};

    for (const group of GROUP_ORDER) {
      groups[group.key] = [];
    }
    groups["other"] = [];

    for (const [key, value] of Object.entries(themeColors)) {
      const groupKey = getGroupForKey(key);
      const group = GROUP_ORDER.find((g) => g.key === groupKey);
      const label = group?.label || "其他配置";

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }

      groups[groupKey].push({
        config_key: key,
        config_value: value,
        description: getDescription(key),
      });
    }

    return groups;
  };

  const getDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      primary: "主色",
      secondary: "辅助色",
      accent: "强调色",
      dark: "深色",
      light: "浅色",
      background: "背景色",
      backgroundAlt: "背景交替色",
      text: "文字色",
      textMuted: "次要文字色",
      border: "边框色",
      card: "卡片背景色",
      colorRed: "红色",
      colorGreen: "绿色",
      colorBlue: "蓝色",
      colorYellow: "黄色",
      colorOrange: "橙色",
      inventoryStatus_inStock: "有货状态颜色",
      inventoryStatus_limited: "库存有限状态颜色",
      inventoryStatus_lowStock: "库存紧张状态颜色",
      inventoryStatus_outOfStock: "缺货状态颜色",
      "btn-primary-bg": "主按钮背景色",
      "btn-primary-text": "主按钮文字色",
      "btn-primary-border": "主按钮边框色",
      "btn-primary-shadow": "主按钮阴影",
      "btn-primary-hover-bg": "主按钮悬停背景色",
      "btn-primary-hover-text": "主按钮悬停文字色",
      "btn-primary-hover-border": "主按钮悬停边框色",
      "btn-primary-hover-transform": "主按钮悬停变换",
      "btn-primary-hover-shadow": "主按钮悬停阴影",
      "btn-secondary-bg": "次按钮背景色",
      "btn-secondary-text": "次按钮文字色",
      "btn-secondary-border": "次按钮边框色",
      "btn-secondary-hover-bg": "次按钮悬停背景色",
      "btn-secondary-hover-text": "次按钮悬停文字色",
      "heading-font": "标题字体",
      "body-font": "正文字体",
      "loading-color": "加载动画颜色",
    };
    return descriptions[key] || key;
  };

  const groupedConfigs = getGroupedConfigs();
  const currentThemeName = themes[selectedTheme]?.name || selectedTheme;
  const currentThemeColors = editedColors[selectedTheme] || {};

  const getPreviewStyle = (key: string): React.CSSProperties => {
    if (key.includes("bg")) {
      return { backgroundColor: currentThemeColors[key] || "#ccc" };
    }
    if (key.includes("text")) {
      return { color: currentThemeColors[key] || "#ccc" };
    }
    return {};
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">主题配置</h1>

      {message && (
        <div className={`mb-4 p-4 rounded ${message.includes("成功") ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
          {message}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-10">加载中...</div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">选择主题</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(themes).map(([key, themeInfo]) => (
                <div
                  key={key}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedTheme === key ? "border-accent bg-accent/10 ring-2 ring-accent" : "border-gray-200 hover:border-accent"
                  }`}
                  onClick={() => handleThemeChange(key as ThemeKey)}
                >
                  <h3 className="text-lg font-semibold mb-2">{themeInfo.name}</h3>
                  <div className="flex gap-1">
                    <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: allColors[key]?.primary || "#ccc" }}></div>
                    <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: allColors[key]?.secondary || "#ccc" }}></div>
                    <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: allColors[key]?.accent || "#ccc" }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-6">{currentThemeName} - 配置列表</h2>

            {GROUP_ORDER.map((group) => {
              const configs = groupedConfigs[group.key];
              if (!configs || configs.length === 0) return null;

              return (
                <div key={group.key} className="mb-8">
                  <h3 className="text-lg font-medium mb-4 text-gray-700 border-b pb-2">{group.label}</h3>
                  <div className="space-y-3">
                    {configs.map((config) => {
                      const isColor = isColorValue(config.config_value) || config.config_key.includes("color") || config.config_key.includes("bg") || config.config_key.includes("border");
                      const isFont = isFontValue(config.config_key);

                      return (
                        <div key={config.config_key} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="w-48 flex-shrink-0">
                            <div className="font-medium text-sm">{config.config_key}</div>
                            <div className="text-xs text-gray-500">{config.description}</div>
                          </div>

                          <div className="flex-1 flex items-center gap-2">
                            {isColor ? (
                              <>
                                <input
                                  type="color"
                                  value={config.config_value}
                                  onChange={(e) => handleColorChange(config.config_key, e.target.value)}
                                  className="w-10 h-10 cursor-pointer rounded border"
                                />
                                <input
                                  type="text"
                                  value={config.config_value}
                                  onChange={(e) => handleColorChange(config.config_key, e.target.value)}
                                  className="flex-1 px-3 py-2 border rounded font-mono text-sm"
                                  placeholder="#000000"
                                />
                              </>
                            ) : (
                              <input
                                type="text"
                                value={config.config_value}
                                onChange={(e) => handleColorChange(config.config_key, e.target.value)}
                                className="flex-1 px-3 py-2 border rounded font-mono text-sm"
                              />
                            )}

                            {isColor && (
                              <div
                                className="w-10 h-10 rounded border-2 flex-shrink-0"
                                style={{ backgroundColor: config.config_value }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {Object.keys(groupedConfigs).filter(k => k === "other").length > 0 && groupedConfigs["other"]?.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4 text-gray-700 border-b pb-2">其他配置</h3>
                <div className="space-y-3">
                  {groupedConfigs["other"].map((config) => (
                    <div key={config.config_key} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="w-48 flex-shrink-0">
                        <div className="font-medium text-sm">{config.config_key}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={config.config_value}
                          onChange={(e) => handleColorChange(config.config_key, e.target.value)}
                          className="w-full px-3 py-2 border rounded font-mono text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t flex gap-4">
              <button
                className="btn-primary px-6 py-3"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "保存中..." : "保存所有修改"}
              </button>
              <button
                className="px-6 py-3 border rounded hover:bg-gray-100 transition-colors"
                onClick={() => setEditedColors(JSON.parse(JSON.stringify(allColors)))}
              >
                重置
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
