"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon, CheckCircleIcon, ShieldCheckIcon, TruckIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { AdminTable } from '@/components/admin/ui/admin-table'; // Assuming AdminTable is available

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

interface GuaranteeFormData {
  text: string;
  text_en: string;
  text_ar: string;
  color: string;
  icon: string;
  is_active: boolean;
  order: number;
}

const emptyFormData: GuaranteeFormData = {
  text: '',
  text_en: '',
  text_ar: '',
  color: '#CA8A04', // Default color
  icon: 'check-circle', // Default icon
  is_active: true,
  order: 0
};

const inputClassName = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
const labelClassName = 'mb-2 block text-sm font-medium text-slate-700';

const guaranteeIconMap = {
  'check-circle': CheckCircleIcon,
  'shield-check': ShieldCheckIcon,
  truck: TruckIcon,
  'credit-card': CreditCardIcon,
};

function GuaranteeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = guaranteeIconMap[name as keyof typeof guaranteeIconMap] || CheckCircleIcon;
  return <Icon className={className} />;
}

export default function GuaranteesPage() {
  const { t, i18n } = useTranslation();
  const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingGuarantee, setEditingGuarantee] = useState<Guarantee | null>(null);
  const [formData, setFormData] = useState<GuaranteeFormData>(emptyFormData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchGuarantees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/guarantees');
      if (response.ok) {
        const result = await response.json();
        const data = result.success ? result.data : result;
        setGuarantees(data.sort((a: Guarantee, b: Guarantee) => a.order - b.order));
      } else {
        throw new Error('Failed to fetch guarantees');
      }
    } catch (error) {
      console.error('Error fetching guarantees:', error);
      setError('服务保证数据加载失败。');
      setGuarantees([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuarantees();
  }, [fetchGuarantees]);

  const metrics = useMemo(() => {
    const total = guarantees.length;
    const active = guarantees.filter(g => g.is_active).length;
    return { total, active };
  }, [guarantees]);

  const openDrawer = useCallback((guarantee: Guarantee | null = null) => {
    setError(null);
    setSuccess(null);
    if (guarantee) {
      setEditingGuarantee(guarantee);
      setFormData({
        text: guarantee.text,
        text_en: guarantee.text_en,
        text_ar: guarantee.text_ar,
        color: guarantee.color,
        icon: guarantee.icon,
        is_active: guarantee.is_active,
        order: guarantee.order
      });
    } else {
      setEditingGuarantee(null);
      setFormData({ ...emptyFormData, order: guarantees.length > 0 ? Math.max(...guarantees.map(g => g.order)) + 1 : 0 });
    }
    setIsDrawerOpen(true);
  }, [guarantees]);

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingGuarantee(null);
    setFormData(emptyFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const method = editingGuarantee ? 'PUT' : 'POST';
    const url = editingGuarantee ? `/api/admin/guarantees/${editingGuarantee.id}` : '/api/admin/guarantees';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingGuarantee ? { ...formData, id: editingGuarantee.id } : formData)
      });

      if (response.ok) {
        setSuccess('服务保证内容已保存');
        closeDrawer();
        fetchGuarantees();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save guarantee');
      }
    } catch (err: any) {
      console.error('Error saving guarantee:', err);
      setError(`保存失败: ${err.message || '未知错误'}`);
    }
  };

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('确定要删除这项服务保证吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/guarantees/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setSuccess('服务保证已删除');
        fetchGuarantees();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete guarantee');
      }
    } catch (err: any) {
      console.error('Error deleting guarantee:', err);
      setError(`删除失败: ${err.message || '未知错误'}`);
    }
  }, [fetchGuarantees]);

  const getGuaranteeText = useCallback((guarantee: Guarantee) => {
    const locale = i18n.language;
    if (locale === 'en') return guarantee.text_en;
    if (locale === 'ar') return guarantee.text_ar;
    return guarantee.text;
  }, [i18n.language]);

  const columns = useMemo(() => [
    {
      key: 'order',
      title: '排序',
      width: '80px',
      render: (item: Guarantee) => (
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">#{item.order}</span>
      )
    },
    {
      key: 'icon',
      title: '图标',
      width: '80px',
      render: (item: Guarantee) => (
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 text-slate-500">
          <GuaranteeIcon name={item.icon} className="h-5 w-5" />
        </div>
      )
    },
    {
      key: 'text',
      title: '内容 (多语言)',
      render: (item: Guarantee) => (
        <div>
          <p className="font-semibold text-slate-950">{getGuaranteeText(item)}</p>
          <p className="text-xs text-slate-500">{item.text_en}</p>
          <p className="text-xs text-slate-500" dir="rtl">{item.text_ar}</p>
        </div>
      )
    },
    {
      key: 'is_active',
      title: '状态',
      width: '100px',
      render: (item: Guarantee) => (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
          {item.is_active ? '启用' : '禁用'}
        </span>
      )
    },
    {
      key: 'actions',
      title: '操作',
      width: '120px',
      align: 'right' as const,
      render: (item: Guarantee) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => openDrawer(item)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">
            <PencilSquareIcon className="h-5 w-5" />
          </button>
          <button onClick={() => handleDelete(item.id)} className="rounded-lg border border-red-100 p-1.5 text-red-600 transition hover:bg-red-50">
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      )
    }
  ], [handleDelete, openDrawer, getGuaranteeText]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="CONTENT OPS"
        title="服务保证管理"
        description="管理网站前台底部显示的服务保证和承诺，确保信息准确、及时更新。"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Guarantees' }]}
        action={
          <button
            onClick={() => openDrawer()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5" />
            新增保证
          </button>
        }
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <AdminCard>
          <p className="text-sm text-slate-500">总服务保证数</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{metrics.total}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">已启用保证数</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">{metrics.active}</p>
        </AdminCard>
      </div>

      <AdminCard title="服务保证列表" description="拖拽调整显示顺序，点击编辑或删除。">
        {guarantees.length === 0 ? (
          <div className="p-6 text-center text-slate-500">暂无服务保证，请添加。</div>
        ) : (
          <AdminTable columns={columns} data={guarantees} rowKey={(item) => String(item.id)} />
        )}
      </AdminCard>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{editingGuarantee ? '编辑服务保证' : '新增服务保证'}</h2>
                <p className="mt-1 text-sm text-slate-500">{editingGuarantee ? '更新服务保证的文本、图标、颜色等属性。' : '添加一个新的服务保证，支持多语言。'}</p>
              </div>
              <button onClick={closeDrawer} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><XMarkIcon className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-8">
              <div>
                <label htmlFor="text" className={labelClassName}>内容 (中文)</label>
                <input type="text" id="text" name="text" value={formData.text} onChange={handleInputChange} className={inputClassName} required />
              </div>
              <div>
                <label htmlFor="text_en" className={labelClassName}>内容 (English)</label>
                <input type="text" id="text_en" name="text_en" value={formData.text_en} onChange={handleInputChange} className={inputClassName} required />
              </div>
              <div>
                <label htmlFor="text_ar" className={labelClassName}>内容 (Arabic)</label>
                <input type="text" id="text_ar" name="text_ar" value={formData.text_ar} onChange={handleInputChange} className={inputClassName} required dir="rtl" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="icon" className={labelClassName}>图标 (Heroicons名称)</label>
                  <input type="text" id="icon" name="icon" value={formData.icon} onChange={handleInputChange} className={inputClassName} placeholder="例如: check-circle" />
                </div>
                <div>
                  <label htmlFor="color" className={labelClassName}>颜色 (Hex Code)</label>
                  <input type="text" id="color" name="color" value={formData.color} onChange={handleInputChange} className={inputClassName} placeholder="例如: #CA8A04" />
                </div>
              </div>
              
              <div>
                <label htmlFor="order" className={labelClassName}>排序 (数字越小越靠前)</label>
                <input type="number" id="order" name="order" value={formData.order} onChange={handleInputChange} className={inputClassName} required />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                启用此服务保证
              </label>

              <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
                <button type="button" onClick={closeDrawer} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">取消</button>
                <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">保存服务保证</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
