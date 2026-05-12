"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface AboutContent {
  title: string;
  titleEn: string;
  titleAr: string;
  description: string;
  descriptionEn: string;
  descriptionAr: string;
  content: string;
  contentEn: string;
  contentAr: string;
  mission: string;
  missionEn: string;
  missionAr: string;
  vision: string;
  visionEn: string;
  visionAr: string;
  values_text: string;
  valuesTextEn: string;
  valuesTextAr: string;
  images: string[];
  videoUrl: string;
  teamMembers: Array<{ name: string; role: string; bio: string; image: string }>;
}

const emptyAbout: AboutContent = {
  title: '',
  titleEn: '',
  titleAr: '',
  description: '',
  descriptionEn: '',
  descriptionAr: '',
  content: '',
  contentEn: '',
  contentAr: '',
  mission: '',
  missionEn: '',
  missionAr: '',
  vision: '',
  visionEn: '',
  visionAr: '',
  values_text: '',
  valuesTextEn: '',
  valuesTextAr: '',
  images: [],
  videoUrl: '',
  teamMembers: []
};

const inputClassName = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
const labelClassName = 'mb-2 block text-sm font-medium text-slate-700';

export default function AdminAboutPage() {
  const [about, setAbout] = useState<AboutContent>(emptyAbout);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchAbout = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/admin/content/about');
      const result = await response.json();
      if (response.ok && result.success) {
        if (result.data) {
          setAbout({ ...emptyAbout, ...result.data, images: Array.isArray(result.data.images) ? result.data.images : [] });
        } else {
          setAbout(emptyAbout);
        }
      } else {
        setError(result.error || '关于我们数据加载失败');
      }
    } catch (error) {
      console.error('Error fetching about:', error);
      setError('关于我们数据加载失败，请检查网络或接口状态');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAbout();
  }, [fetchAbout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/content/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(about)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSuccess('关于我们内容已保存');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || '关于我们内容保存失败');
      }
    } catch (error) {
      console.error('Error updating about:', error);
      setError('关于我们内容保存失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = (index: number, value: string) => {
    const images = [...about.images];
    images[index] = value;
    setAbout({ ...about, images });
  };

  const addImage = () => {
    setAbout({ ...about, images: [...about.images, ''] });
  };

  const removeImage = (index: number) => {
    setAbout({ ...about, images: about.images.filter((_, i) => i !== index) });
  };

  const handleTeamMemberChange = (index: number, field: string, value: string) => {
    const teamMembers = [...about.teamMembers];
    teamMembers[index] = { ...teamMembers[index], [field]: value };
    setAbout({ ...about, teamMembers });
  };

  const addTeamMember = () => {
    setAbout({ ...about, teamMembers: [...about.teamMembers, { name: '', role: '', bio: '', image: '' }] });
  };

  const removeTeamMember = (index: number) => {
    setAbout({ ...about, teamMembers: about.teamMembers.filter((_, i) => i !== index) });
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
        title="关于我们内容管理"
        description="维护前台关于页的品牌故事、团队介绍、企业愿景、媒体资源和页面描述。"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'About' }]}
        action={
          <Link href="/admin/dashboard" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            返回控制台
          </Link>
        }
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div> : null}

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <AdminCard title="页面内容" description="维护关于页标题、简介、内容、使命、愿景、价值观。">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="title" className={labelClassName}>标题</label>
                <input id="title" type="text" value={about.title} onChange={(e) => setAbout({ ...about, title: e.target.value })} className={inputClassName} required />
              </div>
              <div>
                <label htmlFor="titleEn" className={labelClassName}>标题 (EN)</label>
                <input id="titleEn" type="text" value={about.titleEn} onChange={(e) => setAbout({ ...about, titleEn: e.target.value })} className={inputClassName} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="description" className={labelClassName}>简介</label>
                <input id="description" type="text" value={about.description} onChange={(e) => setAbout({ ...about, description: e.target.value })} className={inputClassName} required />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="content" className={labelClassName}>正文内容</label>
                <textarea id="content" value={about.content} onChange={(e) => setAbout({ ...about, content: e.target.value })} className={inputClassName} rows={6} required />
              </div>
              <div>
                <label htmlFor="mission" className={labelClassName}>使命</label>
                <textarea id="mission" value={about.mission} onChange={(e) => setAbout({ ...about, mission: e.target.value })} className={inputClassName} rows={3} />
              </div>
              <div>
                <label htmlFor="vision" className={labelClassName}>愿景</label>
                <textarea id="vision" value={about.vision} onChange={(e) => setAbout({ ...about, vision: e.target.value })} className={inputClassName} rows={3} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="values_text" className={labelClassName}>价值观</label>
                <textarea id="values_text" value={about.values_text} onChange={(e) => setAbout({ ...about, values_text: e.target.value })} className={inputClassName} rows={3} />
              </div>
            </div>
          </AdminCard>

          <AdminCard title="团队成员" description="管理团队成员信息。">
            <div className="space-y-4">
              {about.teamMembers.map((member, index) => (
                <div key={index} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">成员 {index + 1}</span>
                    <button type="button" onClick={() => removeTeamMember(index)} className="rounded-lg border border-red-100 p-1.5 text-red-600 transition hover:bg-red-50">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input type="text" value={member.name} onChange={(e) => handleTeamMemberChange(index, 'name', e.target.value)} className={inputClassName} placeholder="姓名" />
                    <input type="text" value={member.role} onChange={(e) => handleTeamMemberChange(index, 'role', e.target.value)} className={inputClassName} placeholder="职位" />
                    <input type="text" value={member.image} onChange={(e) => handleTeamMemberChange(index, 'image', e.target.value)} className={inputClassName} placeholder="头像 URL" />
                    <input type="text" value={member.bio} onChange={(e) => handleTeamMemberChange(index, 'bio', e.target.value)} className={inputClassName} placeholder="简介" />
                  </div>
                </div>
              ))}
              <button type="button" onClick={addTeamMember} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                <PlusIcon className="h-4 w-4" />
                添加团队成员
              </button>
            </div>
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard title="媒体资源" description="管理关于页图片和视频链接。">
            <div className="space-y-5">
              <div>
                <label htmlFor="videoUrl" className={labelClassName}>视频 URL</label>
                <input id="videoUrl" type="text" value={about.videoUrl} onChange={(e) => setAbout({ ...about, videoUrl: e.target.value })} className={inputClassName} placeholder="YouTube embed URL" />
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
                  {about.images.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">暂无图片</div>
                  ) : about.images.map((image, index) => (
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
                <p className="text-sm font-semibold text-slate-950">保存关于我们内容</p>
                <p className="mt-1 text-sm text-slate-500">保存后前台关于页会读取最新配置。</p>
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
