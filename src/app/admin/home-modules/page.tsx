"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface HomeModule {
  id: number;
  type: 'hero' | 'activity';
  title: string;
  title_en: string;
  title_ar: string;
  description: string;
  description_en: string;
  description_ar: string;
  image: string;
  link?: string;
  is_active: boolean;
  order: number;
  button_text?: string;
  button_text_en?: string;
  button_text_ar?: string;
  button_link?: string;
  secondary_button_text?: string;
  secondary_button_text_en?: string;
  secondary_button_text_ar?: string;
  secondary_button_link?: string;
}

interface ModuleFormData {
  type: 'hero' | 'activity';
  title: string;
  title_en: string;
  title_ar: string;
  description: string;
  description_en: string;
  description_ar: string;
  image: string;
  link?: string;
  is_active: boolean;
  order: number;
  button_text?: string;
  button_text_en?: string;
  button_text_ar?: string;
  button_link?: string;
  secondary_button_text?: string;
  secondary_button_text_en?: string;
  secondary_button_text_ar?: string;
  secondary_button_link?: string;
}

const emptyFormData: ModuleFormData = {
  type: 'activity',
  title: '',
  title_en: '',
  title_ar: '',
  description: '',
  description_en: '',
  description_ar: '',
  image: '',
  link: '',
  is_active: true,
  order: 0,
  button_text: '',
  button_text_en: '',
  button_text_ar: '',
  button_link: '',
  secondary_button_text: '',
  secondary_button_text_en: '',
  secondary_button_text_ar: '',
  secondary_button_link: ''
};

const inputClassName = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
const labelClassName = 'mb-2 block text-sm font-medium text-slate-700';

export default function HomeModulesManagement() {
  const { t, i18n } = useTranslation();
  const [modules, setModules] = useState<HomeModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<HomeModule | null>(null);
  const [formData, setFormData] = useState<ModuleFormData>(emptyFormData);

  const fetchModules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/home-modules');
      if (!response.ok) {
        throw new Error('Failed to fetch home modules');
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to parse modules');
      }
      setModules(result.data);
    } catch (error) {
      console.error('Error fetching modules:', error);
      setError('首页模块加载失败，请刷新或联系技术支持');
      setModules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const sortedModules = useMemo(() => [...modules].sort((a, b) => a.order - b.order), [modules]);

  const metrics = useMemo(() => {
    const hero = modules.filter((item) => item.type === 'hero').length;
    const activity = modules.filter((item) => item.type === 'activity').length;
    const active = modules.filter((item) => item.is_active).length;
    return { total: modules.length, hero, activity, active };
  }, [modules]);

  const getModuleTitle = (module: HomeModule) => {
    const locale = i18n.language;
    if (locale === 'en') return module.title_en;
    if (locale === 'ar') return module.title_ar;
    return module.title;
  };

  const openCreateModal = () => {
    setEditingModule(null);
    setFormData(emptyFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingModule(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'order' ? Number(value) : value }));
  };

  const handleEdit = (module: HomeModule) => {
    setEditingModule(module);
    setFormData({
      type: module.type,
      title: module.title,
      title_en: module.title_en,
      title_ar: module.title_ar,
      description: module.description,
      description_en: module.description_en,
      description_ar: module.description_ar,
      image: module.image,
      link: module.link || '',
      is_active: module.is_active,
      order: module.order,
      button_text: module.button_text || '',
      button_text_en: module.button_text_en || '',
      button_text_ar: module.button_text_ar || '',
      button_link: module.button_link || '',
      secondary_button_text: module.secondary_button_text || '',
      secondary_button_text_en: module.secondary_button_text_en || '',
      secondary_button_text_ar: module.secondary_button_text_ar || '',
      secondary_button_link: module.secondary_button_link || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(
        editingModule ? `/api/admin/home-modules/${editingModule.id}` : '/api/admin/home-modules',
        {
        method: editingModule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingModule ? { ...formData, id: editingModule.id } : formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save home module');
      }

      closeModal();
      setFormData(emptyFormData);
      fetchModules();
    } catch (error) {
      console.error('Error saving module:', error);
      setError('Failed to save home module');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this module?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/home-modules/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete home module');
      }
      fetchModules();
    } catch (error) {
      console.error('Error deleting module:', error);
      setError('Failed to delete home module');
    }
  };

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
        title={t('admin.home_modules.title') || 'Home Page Modules'}
        description="统一管理首页 Hero、活动入口和多语言展示内容，确保前台运营位发布状态清晰可控。"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Home Modules' }]}
        action={
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5" />
            {t('admin.home_modules.add') || 'Add Module'}
          </button>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: '模块总数', value: metrics.total, color: 'blue' },
          { label: 'Hero 区块', value: metrics.hero, color: 'indigo' },
          { label: '活动入口', value: metrics.activity, color: 'emerald' },
          { label: '已启用', value: metrics.active, color: 'green' }
        ].map((item) => (
          <AdminCard key={item.label} className="overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{item.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-2xl ${item.color === 'blue' ? 'bg-blue-50' : item.color === 'indigo' ? 'bg-indigo-50' : item.color === 'emerald' ? 'bg-emerald-50' : 'bg-green-50'}`} />
            </div>
          </AdminCard>
        ))}
      </div>

      <AdminCard title="首页运营位" description="按展示顺序管理模块，建议 Hero 保持唯一，活动入口按运营优先级排序。">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Order</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Title</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Image</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedModules.map((module) => (
                  <tr key={module.id} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">#{module.order}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${module.type === 'hero' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {module.type === 'hero' ? 'Hero' : 'Activity'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="max-w-md">
                        <p className="text-sm font-semibold text-slate-950">{getModuleTitle(module)}</p>
                        <p className="mt-1 line-clamp-1 text-sm text-slate-500">{module.description}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="relative h-12 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        <Image src={module.image} alt={module.title} fill sizes="80px" className="object-cover" />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${module.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {module.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold">
                      <button onClick={() => handleEdit(module)} className="text-blue-600 transition hover:text-blue-800">
                        {t('admin.home_modules.edit') || 'Edit'}
                      </button>
                      <button onClick={() => handleDelete(module.id)} className="ml-4 text-red-600 transition hover:text-red-800">
                        {t('admin.home_modules.delete') || 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminCard>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-4xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Module Editor</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  {editingModule ? (t('admin.home_modules.edit') || 'Edit') : (t('admin.home_modules.add') || 'Add')} {t('admin.home_modules.module') || 'Module'}
                </h2>
              </div>
              <button onClick={closeModal} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="type" className={labelClassName}>{t('admin.home_modules.type') || 'Type'}</label>
                  <select id="type" name="type" value={formData.type} onChange={handleInputChange} required className={inputClassName}>
                    <option value="hero">{t('admin.home_modules.hero') || 'Hero Banner'}</option>
                    <option value="activity">{t('admin.home_modules.activity') || 'Activity Banner'}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="order" className={labelClassName}>{t('admin.home_modules.order') || 'Order'}</label>
                  <input type="number" id="order" name="order" value={formData.order} onChange={handleInputChange} required className={inputClassName} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="title" className={labelClassName}>{t('admin.home_modules.title') || 'Title'} (中文)</label>
                  <input type="text" id="title" name="title" value={formData.title} onChange={handleInputChange} required className={inputClassName} />
                </div>
                <div>
                  <label htmlFor="title_en" className={labelClassName}>{t('admin.home_modules.title') || 'Title'} (English)</label>
                  <input type="text" id="title_en" name="title_en" value={formData.title_en} onChange={handleInputChange} required className={inputClassName} />
                </div>
                <div>
                  <label htmlFor="title_ar" className={labelClassName}>{t('admin.home_modules.title') || 'Title'} (Arabic)</label>
                  <input type="text" id="title_ar" name="title_ar" value={formData.title_ar} onChange={handleInputChange} required className={inputClassName} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="description" className={labelClassName}>{t('admin.home_modules.description') || 'Description'} (中文)</label>
                  <textarea id="description" name="description" value={formData.description} onChange={handleInputChange} rows={4} className={inputClassName} />
                </div>
                <div>
                  <label htmlFor="description_en" className={labelClassName}>{t('admin.home_modules.description') || 'Description'} (English)</label>
                  <textarea id="description_en" name="description_en" value={formData.description_en} onChange={handleInputChange} rows={4} className={inputClassName} />
                </div>
                <div>
                  <label htmlFor="description_ar" className={labelClassName}>{t('admin.home_modules.description') || 'Description'} (Arabic)</label>
                  <textarea id="description_ar" name="description_ar" value={formData.description_ar} onChange={handleInputChange} rows={4} className={inputClassName} />
                </div>
              </div>

              <div>
                <label htmlFor="image" className={labelClassName}>{t('admin.home_modules.image') || 'Image URL'}</label>
                <input type="text" id="image" name="image" value={formData.image} onChange={handleInputChange} required className={inputClassName} />
              </div>

              {formData.type === 'activity' ? (
                <div>
                  <label htmlFor="link" className={labelClassName}>{t('admin.home_modules.link') || 'Link URL'}</label>
                  <input type="text" id="link" name="link" value={formData.link} onChange={handleInputChange} required className={inputClassName} />
                </div>
              ) : null}

              {formData.type === 'hero' ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-sm font-semibold text-slate-950">Hero 按钮配置</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div>
                      <label htmlFor="button_text" className={labelClassName}>{t('admin.home_modules.button_text') || 'Button Text'} (中文)</label>
                      <input type="text" id="button_text" name="button_text" value={formData.button_text} onChange={handleInputChange} className={inputClassName} />
                    </div>
                    <div>
                      <label htmlFor="button_text_en" className={labelClassName}>{t('admin.home_modules.button_text') || 'Button Text'} (English)</label>
                      <input type="text" id="button_text_en" name="button_text_en" value={formData.button_text_en} onChange={handleInputChange} className={inputClassName} />
                    </div>
                    <div>
                      <label htmlFor="button_text_ar" className={labelClassName}>{t('admin.home_modules.button_text') || 'Button Text'} (Arabic)</label>
                      <input type="text" id="button_text_ar" name="button_text_ar" value={formData.button_text_ar} onChange={handleInputChange} className={inputClassName} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="button_link" className={labelClassName}>{t('admin.home_modules.button_link') || 'Button Link'}</label>
                    <input type="text" id="button_link" name="button_link" value={formData.button_link} onChange={handleInputChange} className={inputClassName} />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div>
                      <label htmlFor="secondary_button_text" className={labelClassName}>{t('admin.home_modules.secondary_button_text') || 'Secondary Button Text'} (中文)</label>
                      <input type="text" id="secondary_button_text" name="secondary_button_text" value={formData.secondary_button_text} onChange={handleInputChange} className={inputClassName} />
                    </div>
                    <div>
                      <label htmlFor="secondary_button_text_en" className={labelClassName}>{t('admin.home_modules.secondary_button_text') || 'Secondary Button Text'} (English)</label>
                      <input type="text" id="secondary_button_text_en" name="secondary_button_text_en" value={formData.secondary_button_text_en} onChange={handleInputChange} className={inputClassName} />
                    </div>
                    <div>
                      <label htmlFor="secondary_button_text_ar" className={labelClassName}>{t('admin.home_modules.secondary_button_text') || 'Secondary Button Text'} (Arabic)</label>
                      <input type="text" id="secondary_button_text_ar" name="secondary_button_text_ar" value={formData.secondary_button_text_ar} onChange={handleInputChange} className={inputClassName} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="secondary_button_link" className={labelClassName}>{t('admin.home_modules.secondary_button_link') || 'Secondary Button Link'}</label>
                    <input type="text" id="secondary_button_link" name="secondary_button_link" value={formData.secondary_button_link} onChange={handleInputChange} className={inputClassName} />
                  </div>
                </div>
              ) : null}

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {t('admin.home_modules.active') || 'Active'}
              </label>

              <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
                <button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  {t('admin.home_modules.cancel') || 'Cancel'}
                </button>
                <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
                  {t('admin.home_modules.save') || 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
