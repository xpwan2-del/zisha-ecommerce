"use client";

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

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
      const response = await fetch('/api/translations');
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
      const response = await fetch('/api/translations/missing');
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
      const response = await fetch('/api/translations/sync', {
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
      const response = await fetch(`/api/translations/export?format=${format}`);
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
        promises.push(fetch('/api/translations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: editingKey, language: 'zh', value: editValues.zh })
        }));
      }
      if (editValues.en) {
        promises.push(fetch('/api/translations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: editingKey, language: 'en', value: editValues.en })
        }));
      }
      if (editValues.ar) {
        promises.push(fetch('/api/translations', {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('admin.translations.title', '翻译管理')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('admin.translations.description', '管理系统UI文本翻译，支持中文、英文、阿拉伯文')}
          </p>
        </div>

        {/* Stats Cards */}
        {missingStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">总键值</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{missingStats.total_keys}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">完整翻译</div>
              <div className="text-2xl font-bold text-green-600">{missingStats.complete}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">缺失翻译</div>
              <div className="text-2xl font-bold text-red-600">{missingStats.missing}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">完成率</div>
              <div className="text-2xl font-bold text-blue-600">
                {missingStats.total_keys > 0 ? Math.round((missingStats.complete / missingStats.total_keys) * 100) : 0}%
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder={t('admin.translations.search_placeholder', '搜索键值或翻译内容...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <select
              value={namespaceFilter}
              onChange={(e) => setNamespaceFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="all">{t('admin.translations.all_namespaces', '所有分类')}</option>
              {namespaces.map(ns => (
                <option key={ns} value={ns}>{ns}</option>
              ))}
            </select>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {syncing ? t('common.processing', '处理中...') : t('admin.translations.sync', '同步JSON')}
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {t('admin.translations.export_json', '导出JSON')}
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              {t('admin.translations.export_csv', '导出CSV')}
            </button>
          </div>
        </div>

        {/* Translations Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-1/4">
                    {t('admin.translations.key', '键值')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-1/4">
                    中文 (ZH)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-1/4">
                    English (EN)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-1/4">
                    العربية (AR)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24">
                    {t('admin.translations.actions', '操作')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      {t('common.loading', '加载中...')}
                    </td>
                  </tr>
                ) : filteredTranslations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      {t('common.no_data', '暂无数据')}
                    </td>
                  </tr>
                ) : (
                  filteredTranslations.map((item) => (
                    <tr key={item.key} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">
                        {item.key}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingKey === item.key ? (
                          <textarea
                            value={editValues.zh}
                            onChange={(e) => setEditValues({ ...editValues, zh: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                            rows={2}
                          />
                        ) : (
                          <span className={item.zh ? 'text-gray-900 dark:text-white' : 'text-red-500'}>
                            {item.zh || '❌'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingKey === item.key ? (
                          <textarea
                            value={editValues.en}
                            onChange={(e) => setEditValues({ ...editValues, en: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                            rows={2}
                          />
                        ) : (
                          <span className={item.en ? 'text-gray-900 dark:text-white' : 'text-red-500'}>
                            {item.en || '❌'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm" dir="rtl">
                        {editingKey === item.key ? (
                          <textarea
                            value={editValues.ar}
                            onChange={(e) => setEditValues({ ...editValues, ar: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                            rows={2}
                          />
                        ) : (
                          <span className={item.ar ? 'text-gray-900 dark:text-white' : 'text-red-500'}>
                            {item.ar || '❌'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingKey === item.key ? (
                          <>
                            <button
                              onClick={handleSaveEdit}
                              className="text-green-600 hover:text-green-800 mr-2"
                            >
                              {t('common.save', '保存')}
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              {t('common.cancel', '取消')}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {t('common.edit', '编辑')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination info */}
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t('admin.translations.showing', '显示')} {filteredTranslations.length} / {translations.length} {t('admin.translations.items', '条记录')}
        </div>
      </div>
    </div>
  );
}
