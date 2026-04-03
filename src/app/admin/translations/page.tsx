"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Translation {
  id: number;
  key: string;
  language: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export default function TranslationsPage() {
  const { t } = useTranslation();
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Translation | null>(null);
  const [newTranslation, setNewTranslation] = useState({
    key: '',
    language: 'en',
    value: ''
  });
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');

  // 加载翻译数据
  useEffect(() => {
    fetchTranslations();
  }, []);

  const fetchTranslations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/translations');
      if (response.ok) {
        const data = await response.json();
        // 将对象转换为数组格式
        const translationsArray: Translation[] = [];
        let idCounter = 1;
        
        const processObject = (obj: any, prefix: string = '', language: string = '') => {
          Object.keys(obj).forEach(key => {
            const value = obj[key];
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof value === 'string' && value) {
              translationsArray.push({
                id: idCounter++,
                key: fullKey,
                language: language,
                value,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            } else if (typeof value === 'object' && value !== null) {
              processObject(value, fullKey, language);
            }
          });
        };
        
        Object.keys(data).forEach(language => {
          const languageData = data[language];
          processObject(languageData, '', language);
        });
        
        setTranslations(translationsArray);
      }
    } catch (error) {
      console.error('Error fetching translations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (translation: Translation) => {
    setEditing(translation);
  };

  const handleSave = async () => {
    if (!editing) return;

    try {
      const response = await fetch('/api/translations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editing)
      });

      if (response.ok) {
        fetchTranslations();
        setEditing(null);
      }
    } catch (error) {
      console.error('Error updating translation:', error);
    }
  };

  const handleAdd = async () => {
    if (!newTranslation.key || !newTranslation.value) return;

    try {
      const response = await fetch('/api/translations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTranslation)
      });

      if (response.ok) {
        fetchTranslations();
        setNewTranslation({ key: '', language: 'en', value: '' });
      }
    } catch (error) {
      console.error('Error adding translation:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this translation?')) {
      try {
        const response = await fetch(`/api/translations?id=${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          fetchTranslations();
        }
      } catch (error) {
        console.error('Error deleting translation:', error);
      }
    }
  };

  // 过滤翻译
  const filteredTranslations = translations.filter(translation => {
    const matchesSearch = translation.key.toLowerCase().includes(search.toLowerCase()) ||
                         translation.value.toLowerCase().includes(search.toLowerCase());
    const matchesLanguage = languageFilter === 'all' || translation.language === languageFilter;
    return matchesSearch && matchesLanguage;
  });

  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Translation Management</h1>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="Search translations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
          />
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Languages</option>
            <option value="en">English</option>
            <option value="zh">Chinese</option>
            <option value="ar">Arabic</option>
          </select>
        </div>

        {/* Add New Translation */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Translation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Translation Key"
              value={newTranslation.key}
              onChange={(e) => setNewTranslation({ ...newTranslation, key: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <select
              value={newTranslation.language}
              onChange={(e) => setNewTranslation({ ...newTranslation, language: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="en">English</option>
              <option value="zh">Chinese</option>
              <option value="ar">Arabic</option>
            </select>
            <input
              type="text"
              placeholder="Translation Value"
              value={newTranslation.value}
              onChange={(e) => setNewTranslation({ ...newTranslation, value: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <button
            onClick={handleAdd}
            className="mt-4 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Add Translation
          </button>
        </div>

        {/* Translations Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Language
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Updated At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      Loading translations...
                    </td>
                  </tr>
                ) : filteredTranslations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      No translations found
                    </td>
                  </tr>
                ) : (
                  filteredTranslations.map((translation) => (
                    <tr key={translation.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editing?.id === translation.id ? (
                          <input
                            type="text"
                            value={editing.key}
                            onChange={(e) => setEditing({ ...editing, key: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : (
                          translation.key
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editing?.id === translation.id ? (
                          <select
                            value={editing.language}
                            onChange={(e) => setEditing({ ...editing, language: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded"
                          >
                            <option value="en">English</option>
                            <option value="zh">Chinese</option>
                            <option value="ar">Arabic</option>
                          </select>
                        ) : (
                          translation.language.toUpperCase()
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editing?.id === translation.id ? (
                          <input
                            type="text"
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded w-full"
                          />
                        ) : (
                          translation.value
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(translation.updated_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editing?.id === translation.id ? (
                          <>
                            <button
                              onClick={handleSave}
                              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 mr-3"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(translation)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(translation.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
