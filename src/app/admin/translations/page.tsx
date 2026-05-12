"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { 
  CloudArrowUpIcon, 
  ArrowDownTrayIcon, 
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  LanguageIcon
} from '@heroicons/react/24/outline';

interface TranslationData {
  key: string;
  zh?: string;
  en?: string;
  ar?: string;
  updated_at?: string;
}

interface MissingStats {
  total_keys: number;
  complete: number;
  missing: number;
  by_language: {
    zh: { total: number; missing: number };
    en: { total: number; missing: number };
    ar: { total: number; missing: number };
  };
}

const inputClassName = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

export default function TranslationsPage() {
  const { t, i18n } = useTranslation();
  const [translations, setTranslations] = useState<TranslationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState('all');
  const [missingStats, setMissingStats] = useState<MissingStats | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ zh: string; en: string; ar: string }>({ zh: '', en: '', ar: '' });

  const fetchTranslations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/translations');
      if (response.ok) {
        const data = await response.json();
        const translationsArray: TranslationData[] = [];
        const processObject = (obj: any, prefix: string = '', lang: string = '') => {
          Object.keys(obj).forEach(key => {
            const value = obj[key];
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (typeof value === 'string' && value) {
              const existing = translationsArray.find(t => t.key === fullKey);
              if (existing) {
                (existing as any)[lang] = value;
              } else {
                translationsArray.push({ key: fullKey, [lang]: value });
              }
            } else if (typeof value === 'object' && value !== null) {
              processObject(value, fullKey, lang);
            }
          });
        };

        Object.keys(data).forEach(language => {
          processObject(data[language], '', language);
        });

        const mergedTranslations: { [key: string]: TranslationData } = {};
        translationsArray.forEach(item => {
          const existing = mergedTranslations[item.key];
          if (existing) {
            Object.assign(existing, item);
          } else {
            mergedTranslations[item.key] = { ...item };
          }
        });

        setTranslations(Object.values(mergedTranslations));
      }
    } catch (error) {
      console.error('Error fetching translations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMissingStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/translations/missing');
      if (response.ok) {
        const data = await response.json();
        setMissingStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching missing stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchTranslations();
    fetchMissingStats();
  }, [fetchTranslations, fetchMissingStats]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/translations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'full' })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`同步完成！新增: ${result.data.added}, 更新: ${result.data.updated}`);
        fetchTranslations();
        fetchMissingStats();
      }
    } catch (error) {
      console.error('Error syncing translations:', error);
      alert('同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/admin/translations/export?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translations-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting translations:', error);
    }
  };

  const handleEdit = (item: TranslationData) => {
    setEditingKey(item.key);
    setEditValues({
      zh: item.zh || '',
      en: item.en || '',
      ar: item.ar || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingKey) return;

    try {
      const promises = [];
      if (editValues.zh) {
        promises.push(fetch('/api/admin/translations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: editingKey, language: 'zh', value: editValues.zh })
        }));
      }
      if (editValues.en) {
        promises.push(fetch('/api/admin/translations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: editingKey, language: 'en', value: editValues.en })
        }));
      }
      if (editValues.ar) {
        promises.push(fetch('/api/admin/translations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: editingKey, language: 'ar', value: editValues.ar })
        }));
      }

      await Promise.all(promises);
      setEditingKey(null);
      fetchTranslations();
      fetchMissingStats();
    } catch (error) {
      console.error('Error saving translation:', error);
    }
  };

  const getNamespaceFromKey = (key: string) => {
    return key.split('.')[0];
  };

  const filteredTranslations = translations.filter(item => {
    const matchesSearch = search === '' ||
      item.key.toLowerCase().includes(search.toLowerCase()) ||
      (item.zh && item.zh.includes(search)) ||
      (item.en && item.en.toLowerCase().includes(search.toLowerCase())) ||
      (item.ar && item.ar.includes(search));

    const namespace = getNamespaceFromKey(item.key);
    const matchesNamespace = namespaceFilter === 'all' || namespace === namespaceFilter;

    return matchesSearch && matchesNamespace;
  });

  const namespaces = Array.from(new Set(translations.map(t => getNamespaceFromKey(t.key))));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="GLOBALIZATION"
        title="语言与翻译管理"
        description="统一管理多语言词条。您可以同步源码键值，也可以在此直接编辑各语言版本。建议在发布前完成所有缺失项的翻译。"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Translations' }]}
        action={
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              <CloudArrowUpIcon className="h-5 w-5" />
              {syncing ? '同步中...' : '同步 JSON'}
            </button>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
               <button onClick={() => handleExport('json')} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition hover:bg-slate-50 rounded-lg">JSON</button>
               <div className="h-4 w-px bg-slate-200 mx-1" />
               <button onClick={() => handleExport('csv')} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition hover:bg-slate-50 rounded-lg">CSV</button>
            </div>
          </div>
        }
      />

      {/* 统计指标 */}
      {missingStats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <AdminCard className="relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-slate-50 p-3 text-slate-600">
                <LanguageIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">总键值</p>
                <p className="text-2xl font-bold text-slate-950">{missingStats.total_keys}</p>
              </div>
            </div>
          </AdminCard>
          <AdminCard>
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <CheckCircleIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">已完整</p>
                <p className="text-2xl font-bold text-emerald-600">{missingStats.complete}</p>
              </div>
            </div>
          </AdminCard>
          <AdminCard>
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                <ExclamationCircleIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">待补充</p>
                <p className="text-2xl font-bold text-red-600">{missingStats.missing}</p>
              </div>
            </div>
          </AdminCard>
          <AdminCard>
             <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <div className="text-lg font-bold">%</div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">覆盖率</p>
                <p className="text-2xl font-bold text-blue-600">
                  {missingStats.total_keys > 0 ? Math.round((missingStats.complete / missingStats.total_keys) * 100) : 0}%
                </p>
              </div>
            </div>
          </AdminCard>
        </div>
      )}

      {/* 筛选条 */}
      <AdminCard>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索键值或翻译内容..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClassName} pl-11`}
            />
          </div>
          <select
            value={namespaceFilter}
            onChange={(e) => setNamespaceFilter(e.target.value)}
            className={`${inputClassName} md:w-48`}
          >
            <option value="all">所有分类</option>
            {namespaces.map(ns => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
        </div>

        {/* 翻译表格 */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/4">Key</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/4">中文 (ZH)</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/4">English (EN)</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/4">Arabic (AR)</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-400">正在努力加载翻译项...</td></tr>
                ) : filteredTranslations.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-400">没有找到匹配的词条</td></tr>
                ) : filteredTranslations.map((item) => (
                  <tr key={item.key} className={`transition group hover:bg-slate-50/80 ${editingKey === item.key ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{item.key}</td>
                    <td className="px-5 py-4">
                      {editingKey === item.key ? (
                        <textarea
                          value={editValues.zh}
                          onChange={(e) => setEditValues({ ...editValues, zh: e.target.value })}
                          className="w-full rounded-lg border-slate-200 text-sm focus:ring-blue-500"
                          rows={2}
                        />
                      ) : (
                        <div className={`text-sm leading-relaxed ${item.zh ? 'text-slate-900' : 'text-red-400 italic'}`}>
                          {item.zh || '未翻译'}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {editingKey === item.key ? (
                        <textarea
                          value={editValues.en}
                          onChange={(e) => setEditValues({ ...editValues, en: e.target.value })}
                          className="w-full rounded-lg border-slate-200 text-sm focus:ring-blue-500"
                          rows={2}
                        />
                      ) : (
                        <div className={`text-sm leading-relaxed ${item.en ? 'text-slate-900' : 'text-red-400 italic'}`}>
                          {item.en || '未翻译'}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4" dir="rtl">
                      {editingKey === item.key ? (
                        <textarea
                          value={editValues.ar}
                          onChange={(e) => setEditValues({ ...editValues, ar: e.target.value })}
                          className="w-full rounded-lg border-slate-200 text-sm focus:ring-blue-500"
                          rows={2}
                        />
                      ) : (
                        <div className={`text-sm leading-relaxed ${item.ar ? 'text-slate-900' : 'text-red-400 italic'}`}>
                          {item.ar || 'لا يوجد ترجمة'}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {editingKey === item.key ? (
                        <div className="flex flex-col gap-2">
                          <button onClick={handleSaveEdit} className="text-xs font-bold text-green-600 hover:text-green-800">保存</button>
                          <button onClick={() => setEditingKey(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">取消</button>
                        </div>
                      ) : (
                        <button onClick={() => handleEdit(item)} className="text-sm font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition hover:text-blue-800">编辑</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-400">
          <p>共搜索到 {filteredTranslations.length} 个词条</p>
          <p>分类: {namespaceFilter === 'all' ? '全部' : namespaceFilter}</p>
        </div>
      </AdminCard>
    </div>
  );
}
