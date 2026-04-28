'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Guarantee {
  id: number;
  text: string;
  text_en: string;
  text_ar: string;
  color: string;
  icon: string;
  is_active: boolean;
  order: number;
}

export default function GuaranteesPage() {
  const { t, i18n } = useTranslation();
  const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGuarantee, setNewGuarantee] = useState<Partial<Guarantee>>({
    text: '',
    text_en: '',
    text_ar: '',
    color: '#CA8A04',
    icon: 'check-circle',
    is_active: true,
    order: 0
  });

  useEffect(() => {
    fetchGuarantees();
  }, []);

  const fetchGuarantees = async () => {
    try {
      const response = await fetch('/api/guarantees');
      if (response.ok) {
        const data = await response.json();
        setGuarantees(data.sort((a: Guarantee, b: Guarantee) => a.order - b.order));
      }
    } catch (error) {
      console.error('Error fetching guarantees:', error);
      // Use default guarantees if API fails
      setGuarantees([
        {
          id: 1,
          text: 'Free shipping on orders over $50',
          text_en: 'Free shipping on orders over $50',
          text_ar: 'شحن مجاني على الطلبات فوق 50 دولار',
          color: '#CA8A04',
          icon: 'check-circle',
          is_active: true,
          order: 0
        },
        {
          id: 2,
          text: '30-day returns',
          text_en: '30-day returns',
          text_ar: 'إرجاع في غضون 30 يومًا',
          color: '#CA8A04',
          icon: 'check-circle',
          is_active: true,
          order: 1
        },
        {
          id: 3,
          text: 'Authentic guarantee',
          text_en: 'Authentic guarantee',
          text_ar: 'ضمان أصالة',
          color: '#CA8A04',
          icon: 'check-circle',
          is_active: true,
          order: 2
        },
        {
          id: 4,
          text: 'Green product',
          text_en: 'Green product',
          text_ar: 'منتج أخضر',
          color: '#CA8A04',
          icon: 'check-circle',
          is_active: true,
          order: 3
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGuarantee = async () => {
    if (!newGuarantee.text || !newGuarantee.text_en || !newGuarantee.text_ar) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('/api/guarantees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newGuarantee)
      });

      if (response.ok) {
        fetchGuarantees();
        setNewGuarantee({
          text: '',
          text_en: '',
          text_ar: '',
          color: '#CA8A04',
          icon: 'check-circle',
          is_active: true,
          order: guarantees.length
        });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding guarantee:', error);
      // For demo purposes, just add to local state
      const newId = Math.max(...guarantees.map(g => g.id), 0) + 1;
      setGuarantees([...guarantees, {
        id: newId,
        text: newGuarantee.text || '',
        text_en: newGuarantee.text_en || '',
        text_ar: newGuarantee.text_ar || '',
        color: newGuarantee.color || '#CA8A04',
        icon: newGuarantee.icon || 'check-circle',
        is_active: newGuarantee.is_active || true,
        order: newGuarantee.order || guarantees.length
      }]);
      setNewGuarantee({
        text: '',
        text_en: '',
        text_ar: '',
        color: '#CA8A04',
        icon: 'check-circle',
        is_active: true,
        order: guarantees.length + 1
      });
      setShowAddForm(false);
    }
  };

  const handleUpdateGuarantee = async (id: number, updates: Partial<Guarantee>) => {
    try {
      const response = await fetch(`/api/guarantees/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        fetchGuarantees();
      }
    } catch (error) {
      console.error('Error updating guarantee:', error);
      // For demo purposes, just update local state
      setGuarantees(guarantees.map(g => 
        g.id === id ? { ...g, ...updates } : g
      ));
    }
  };

  const handleDeleteGuarantee = async (id: number) => {
    if (!confirm('Are you sure you want to delete this guarantee?')) {
      return;
    }

    try {
      const response = await fetch(`/api/guarantees/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchGuarantees();
      }
    } catch (error) {
      console.error('Error deleting guarantee:', error);
      // For demo purposes, just remove from local state
      setGuarantees(guarantees.filter(g => g.id !== id));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-48 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">服务保证管理</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: '1px solid var(--btn-primary-border)'
            }}
          >
            {showAddForm ? '取消' : '添加服务保证'}
          </button>
        </div>

        {showAddForm && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">添加服务保证</h3>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
                    中文文本
                  </label>
                  <input
                    type="text"
                    id="text"
                    value={newGuarantee.text || ''}
                    onChange={(e) => setNewGuarantee({ ...newGuarantee, text: e.target.value })}
                    className="shadow-sm focus:ring-[#CA8A04] focus:border-[#CA8A04] block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="text_en" className="block text-sm font-medium text-gray-700 mb-1">
                    英文文本
                  </label>
                  <input
                    type="text"
                    id="text_en"
                    value={newGuarantee.text_en || ''}
                    onChange={(e) => setNewGuarantee({ ...newGuarantee, text_en: e.target.value })}
                    className="shadow-sm focus:ring-[#CA8A04] focus:border-[#CA8A04] block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="text_ar" className="block text-sm font-medium text-gray-700 mb-1">
                    阿拉伯文文本
                  </label>
                  <input
                    type="text"
                    id="text_ar"
                    value={newGuarantee.text_ar || ''}
                    onChange={(e) => setNewGuarantee({ ...newGuarantee, text_ar: e.target.value })}
                    className="shadow-sm focus:ring-[#CA8A04] focus:border-[#CA8A04] block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                    颜色
                  </label>
                  <input
                    type="color"
                    id="color"
                    value={newGuarantee.color || '#CA8A04'}
                    onChange={(e) => setNewGuarantee({ ...newGuarantee, color: e.target.value })}
                    className="shadow-sm focus:ring-[#CA8A04] focus:border-[#CA8A04] block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-1">
                    顺序
                  </label>
                  <input
                    type="number"
                    id="order"
                    value={newGuarantee.order || 0}
                    onChange={(e) => setNewGuarantee({ ...newGuarantee, order: parseInt(e.target.value) })}
                    className="shadow-sm focus:ring-[#CA8A04] focus:border-[#CA8A04] block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={newGuarantee.is_active || false}
                    onChange={(e) => setNewGuarantee({ ...newGuarantee, is_active: e.target.checked })}
                    className="h-4 w-4 text-[#CA8A04] focus:ring-[#CA8A04] border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    启用
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleAddGuarantee}
                  className="text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
                  style={{
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    border: '1px solid var(--btn-primary-border)'
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    文本
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    颜色
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    顺序
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    状态
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {guarantees.map((guarantee) => (
                  <tr key={guarantee.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{guarantee.text}</div>
                      <div className="text-sm text-gray-500">{guarantee.text_en}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-2"
                          style={{ backgroundColor: guarantee.color }}
                        ></div>
                        <span className="text-sm text-gray-900">{guarantee.color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={guarantee.order}
                        onChange={(e) => handleUpdateGuarantee(guarantee.id, { order: parseInt(e.target.value) })}
                        className="shadow-sm focus:ring-[#CA8A04] focus:border-[#CA8A04] block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={guarantee.is_active}
                          onChange={(e) => handleUpdateGuarantee(guarantee.id, { is_active: e.target.checked })}
                          className="h-4 w-4 text-[#CA8A04] focus:ring-[#CA8A04] border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">
                          {guarantee.is_active ? '启用' : '禁用'}
                        </span>
                      </label>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteGuarantee(guarantee.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
