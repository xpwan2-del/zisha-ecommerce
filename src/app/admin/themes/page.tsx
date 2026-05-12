"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { CheckCircleIcon, PaintBrushIcon } from '@heroicons/react/24/outline';

type ThemeKey = 'chinese' | 'middleEastern' | 'amazon' | 'middleEasternLuxury';

interface ThemeInfo {
  name: string;
}

interface ThemeDisplayInfo {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  border: string;
  loadingColor: string;
  btnPrimaryBg: string;
  btnPrimaryText: string;
  btnPrimaryBorder: string;
  btnPrimaryShadow: string;
}

const themeDescriptions: Record<string, string> = {
  chinese: '东方雅韵，适合紫砂与茶器品牌展示。',
  middleEastern: '中东视觉语境，适合阿语市场体验。',
  amazon: '偏电商平台风格，强调转化与效率。',
  middleEasternLuxury: '高端奢华风格，适合高客单展示。'
};

export default function ThemeSettings() {
  const [themes, setThemes] = useState<Record<string, ThemeInfo>>({});
  const [themeColors, setThemeColors] = useState<Record<string, Record<string, string>>>({});
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>('chinese');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [message, setMessage] = useState('');

  const fetchThemes = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings/theme-colors/themes');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setThemes(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch themes:', error);
    }
  }, []);

  const fetchColors = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings/theme-colors');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setThemeColors(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch colors:', error);
    }
  }, []);

  useEffect(() => {
    const loadThemeData = async () => {
      setIsFetching(true);
      await Promise.all([fetchThemes(), fetchColors()]);
      setIsFetching(false);
    };
    loadThemeData();
  }, [fetchThemes, fetchColors]);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/settings/general', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active_theme: selectedTheme })
      });

      if (response.ok) {
        setMessage('主题配置保存成功');
      } else {
        setMessage('保存失败，请重试');
      }
    } catch (error) {
      console.error('Failed to save theme:', error);
      setMessage('保存失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const getThemeDisplayInfo = useCallback((themeKey: string): ThemeDisplayInfo => {
    const colors = themeColors[themeKey] || {};
    return {
      primary: colors.primary || '#1A237E',
      secondary: colors.secondary || '#D4AF37',
      accent: colors.accent || '#5D3B6D',
      background: colors.background || '#F9F5E9',
      border: colors.border || '#E5E7EB',
      loadingColor: colors['loading-color'] || '#1A237E',
      btnPrimaryBg: colors['btn-primary-bg'] || '#1A237E',
      btnPrimaryText: colors['btn-primary-text'] || '#FFFFFF',
      btnPrimaryBorder: colors['btn-primary-border'] || '#D4AF37',
      btnPrimaryShadow: colors['btn-primary-shadow'] || '0 4px 14px rgba(0,0,0,0.3)'
    };
  }, [themeColors]);

  const selectedThemeInfo = useMemo(() => getThemeDisplayInfo(selectedTheme), [selectedTheme, getThemeDisplayInfo]);
  const themeEntries = useMemo(() => Object.entries(themes), [themes]);

  if (isFetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="BRAND SYSTEM"
        title="主题配置中心"
        description="统一管理前台品牌主题色和视觉风格。建议上线前确认按钮、加载动画和背景色在不同语言环境下都清晰可读。"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Themes' }]}
        action={
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            <CheckCircleIcon className="h-5 w-5" />
            {isLoading ? '保存中...' : '保存主题配置'}
          </button>
        }
      />

      {message ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${message.includes('成功') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminCard title="主题方案" description="选择一个前台主题方案并保存。当前选中的主题会影响前台整体视觉表达。">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {themeEntries.map(([key, themeInfo]) => {
              const displayInfo = getThemeDisplayInfo(key);
              const isSelected = selectedTheme === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedTheme(key as ThemeKey)}
                  className={`rounded-2xl border p-5 text-left transition ${isSelected ? 'border-blue-500 bg-blue-50/70 shadow-sm ring-4 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{themeInfo.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{themeDescriptions[key] || '自定义品牌主题方案。'}</p>
                    </div>
                    {isSelected ? <CheckCircleIcon className="h-6 w-6 text-blue-600" /> : <PaintBrushIcon className="h-6 w-6 text-slate-300" />}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {[displayInfo.primary, displayInfo.secondary, displayInfo.accent, displayInfo.background].map((color) => (
                      <span key={color} className="h-9 w-9 rounded-full border border-white shadow ring-1 ring-slate-200" style={{ backgroundColor: color }} />
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3">
                    <span className="text-xs font-semibold text-slate-500">按钮预览</span>
                    <span
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                      style={{
                        background: displayInfo.btnPrimaryBg,
                        borderColor: displayInfo.btnPrimaryBorder,
                        color: displayInfo.btnPrimaryText,
                        boxShadow: displayInfo.btnPrimaryShadow
                      }}
                    >
                      Button
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </AdminCard>

        <div className="space-y-6">
          <AdminCard title="当前主题预览" description="保存前可以快速检查主题的关键视觉变量。">
            <div className="overflow-hidden rounded-2xl border border-slate-200" style={{ backgroundColor: selectedThemeInfo.background }}>
              <div className="p-6">
                <div className="rounded-2xl bg-white/80 p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: selectedThemeInfo.accent }}>Preview</p>
                  <h3 className="mt-3 text-2xl font-semibold" style={{ color: selectedThemeInfo.primary }}>紫砂电商前台主题</h3>
                  <p className="mt-2 text-sm" style={{ color: selectedThemeInfo.accent }}>展示按钮、主色、背景和强调色的组合效果。</p>
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      className="rounded-xl border px-4 py-2 text-sm font-semibold"
                      style={{
                        background: selectedThemeInfo.btnPrimaryBg,
                        borderColor: selectedThemeInfo.btnPrimaryBorder,
                        color: selectedThemeInfo.btnPrimaryText,
                        boxShadow: selectedThemeInfo.btnPrimaryShadow
                      }}
                    >
                      立即购买
                    </button>
                    <span className="h-7 w-7 animate-spin rounded-full border-2" style={{ borderColor: selectedThemeInfo.border, borderTopColor: selectedThemeInfo.loadingColor }} />
                  </div>
                </div>
              </div>
            </div>
          </AdminCard>

          <AdminCard>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(selectedThemeInfo).slice(0, 8).map(([key, value]) => (
                <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-medium text-slate-500">{key}</p>
                  <p className="mt-1 truncate font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
