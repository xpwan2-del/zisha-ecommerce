"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ContactContent {
  title: string;
  description: string;
  images: string[];
  videoUrl: string;
  address: string;
  email: string;
  phone: string;
  openingHours: string;
}

const emptyContact: ContactContent = {
  title: '',
  description: '',
  images: [],
  videoUrl: '',
  address: '',
  email: '',
  phone: '',
  openingHours: ''
};

const inputClassName = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
const labelClassName = 'mb-2 block text-sm font-medium text-slate-700';

export default function AdminContactPage() {
  const [contact, setContact] = useState<ContactContent>(emptyContact);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchContact = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/admin/content/contact');
      const result = await response.json();
      if (response.ok && result.success) {
        if (result.data) {
          setContact({ ...emptyContact, ...result.data, images: Array.isArray(result.data.images) ? result.data.images : [] });
        } else {
          setContact(emptyContact);
        }
      } else {
        setError(result.error || '联系信息加载失败');
      }
    } catch (error) {
      console.error('Error fetching contact:', error);
      setError('联系信息加载失败，请检查网络或接口状态');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/content/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSuccess('联系信息已保存');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || '联系信息保存失败');
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      setError('联系信息保存失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = (index: number, value: string) => {
    const images = [...contact.images];
    images[index] = value;
    setContact({ ...contact, images });
  };

  const addImage = () => {
    setContact({ ...contact, images: [...contact.images, ''] });
  };

  const removeImage = (index: number) => {
    setContact({ ...contact, images: contact.images.filter((_, i) => i !== index) });
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
        title="联系我们内容管理"
        description="维护前台联系页的联系方式、营业时间、媒体资源和页面描述，保证客户触达信息准确。"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Contact' }]}
        action={
          <Link href="/admin/dashboard" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            返回控制台
          </Link>
        }
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div> : null}

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <AdminCard title="页面内容" description="维护联系页标题、简介和主要联系方式。">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="title" className={labelClassName}>标题</label>
              <input id="title" type="text" value={contact.title} onChange={(e) => setContact({ ...contact, title: e.target.value })} className={inputClassName} required />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="description" className={labelClassName}>简介</label>
              <input id="description" type="text" value={contact.description} onChange={(e) => setContact({ ...contact, description: e.target.value })} className={inputClassName} required />
            </div>
            <div>
              <label htmlFor="email" className={labelClassName}>邮箱</label>
              <input id="email" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={inputClassName} required />
            </div>
            <div>
              <label htmlFor="phone" className={labelClassName}>电话</label>
              <input id="phone" type="text" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={inputClassName} required />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="address" className={labelClassName}>地址</label>
              <input id="address" type="text" value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} className={inputClassName} required />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="openingHours" className={labelClassName}>营业时间</label>
              <textarea id="openingHours" value={contact.openingHours} onChange={(e) => setContact({ ...contact, openingHours: e.target.value })} className={inputClassName} rows={5} required />
            </div>
          </div>
        </AdminCard>

        <div className="space-y-6">
          <AdminCard title="媒体资源" description="管理联系页图片和视频链接。">
            <div className="space-y-5">
              <div>
                <label htmlFor="videoUrl" className={labelClassName}>视频 URL</label>
                <input id="videoUrl" type="text" value={contact.videoUrl} onChange={(e) => setContact({ ...contact, videoUrl: e.target.value })} className={inputClassName} placeholder="YouTube embed URL" />
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">图片 URL</label>
                  <button type="button" onClick={addImage} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                    <PlusIcon className="h-4 w-4" />
                    添加图片
                  </button>
                </div>
                <div className="space-y-3">
                  {contact.images.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">暂无图片，可添加门店或客服展示图。</div>
                  ) : contact.images.map((image, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input type="text" value={image} onChange={(e) => handleImageChange(index, e.target.value)} className={inputClassName} placeholder="Image URL" />
                      <button type="button" onClick={() => removeImage(index)} className="rounded-xl border border-red-100 p-2.5 text-red-600 transition hover:bg-red-50">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AdminCard>

          <AdminCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">保存联系信息</p>
                <p className="mt-1 text-sm text-slate-500">保存后前台联系页会读取最新配置。</p>
              </div>
              <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
                {isSaving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </AdminCard>
        </div>
      </form>
    </div>
  );
}
