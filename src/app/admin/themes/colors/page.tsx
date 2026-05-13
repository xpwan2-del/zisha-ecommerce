"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

const colorLabels: Record<string, string> = {
  primary: "主色",
  secondary: "副色",
  accent: "强调色",
  dark: "深色",
  light: "浅色",
  background: "背景色",
  backgroundAlt: "备用背景色",
  text: "文字色",
  textMuted: "弱文字色",
  border: "边框色",
  card: "卡片背景",
};

interface ThemeConfig {
  name: string;
  colors: Record<string, string>;
}

export default function AdminThemeColorsPage() {
  const [themes, setThemes] = useState<Record<string, ThemeConfig>>({});
  const [selectedTheme, setSelectedTheme] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchThemes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [themesRes, colorsRes] = await Promise.all([
        fetch("/api/admin/settings/theme-colors/themes"),
        fetch("/api/admin/settings/theme-colors"),
      ]);

      const themesResult = await themesRes.json();
      const colorsResult = await colorsRes.json();

      if (!themesRes.ok || !themesResult.success) throw new Error(themesResult.error || "主题加载失败");
      if (!colorsRes.ok || !colorsResult.success) throw new Error(colorsResult.error || "颜色配置加载失败");

      const themesData: Record<string, ThemeConfig> = {};
      for (const [key, value] of Object.entries(themesResult.data)) {
        themesData[key] = {
          name: (value as any).name,
          colors: colorsResult.data[key] || {},
        };
      }
      setThemes(themesData);
      if (!selectedTheme && Object.keys(themesData).length > 0) {
        setSelectedTheme(Object.keys(themesData)[0]);
      }
    } catch (error) {
      console.error("Error fetching theme data:", error);
      setError("主题数据加载失败");
    } finally {
      setIsLoading(false);
    }
  }, [selectedTheme]);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const handleColorChange = async (key: string, value: string) => {
    if (!selectedTheme) return;
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/settings/theme-colors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme_key: selectedTheme,
          config_key: key,
          config_value: value,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setThemes((prev) => ({
          ...prev,
          [selectedTheme]: {
            ...prev[selectedTheme],
            colors: { ...prev[selectedTheme].colors, [key]: value },
          },
        }));
        setSuccess("主题色已保存");
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(result.error || "保存失败");
      }
    } catch (error) {
      console.error("Error saving color:", error);
      setError("保存失败，请稍后重试");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  const currentTheme = themes[selectedTheme];
  const colors = currentTheme?.colors || {};

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="BRANDING"
        title="主题色管理"
        description="查看和调整各套主题的颜色配置，选择主题后即可逐项修改颜色值并实时保存。"
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Theme Colors" },
        ]}
        action={
          <Link
            href="/admin/dashboard"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            返回控制台
          </Link>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <AdminCard title="选择主题" description="选择要编辑的主题。">
          <div className="flex flex-col gap-3">
            {Object.entries(themes).map(([key, value]) => (
              <button
                key={key}
                className={`rounded-xl px-5 py-3.5 text-left text-sm font-semibold transition ${
                  selectedTheme === key
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => setSelectedTheme(key)}
              >
                <div className="text-sm font-medium">{value.name}</div>
                <div className="mt-1 text-xs text-slate-500">Theme: {key}</div>
              </button>
            ))}
            {Object.keys(themes).length === 0 ? (
              <p className="text-sm text-slate-500">暂无可用主题。</p>
            ) : null}
          </div>
        </AdminCard>

        <AdminCard
          title={currentTheme ? `${currentTheme.name} 颜色配置` : "颜色配置"}
          description="修改颜色值后自动保存。"
        >
          <div className="space-y-4">
            {Object.entries(colors).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="h-10 w-10 rounded-lg ring-1 ring-slate-200"
                    style={{ backgroundColor: value }}
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {colorLabels[key] || key}
                    </div>
                    <div className="text-xs text-slate-500">{key}</div>
                  </div>
                </div>
                <input
                  type="color"
                  value={value}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border-0"
                />
              </div>
            ))}
            {Object.keys(colors).length === 0 && (
              <p className="text-sm text-slate-500">所选主题暂无颜色配置。</p>
            )}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
