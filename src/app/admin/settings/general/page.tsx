"use client";

import { useEffect, useMemo, useState } from 'react';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

const defaultConfigs = {
  site_name: '',
  support_email: '',
  support_phone: '',
  default_currency: 'AED',
  order_timeout_minutes: '30',
  low_stock_threshold: '5',
};

export default function GeneralSettingsPage() {
  const [configs, setConfigs] = useState<Record<string, string>>(defaultConfigs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/settings/general');
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '获取系统配置失败');
        return;
      }
      setConfigs({ ...defaultConfigs, ...(data.data || {}) });
    } catch (err) {
      setError('网络错误，无法获取系统配置');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchConfigs();
  }, []);

  const updateConfig = (key: string, value: string) => {
    setConfigs((current) => ({ ...current, [key]: value }));
  };

  const saveConfigs = async () => {
    if (!window.confirm('系统配置会影响后台和业务流程，确认保存吗？')) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch('/api/admin/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configs),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '保存系统配置失败');
        return;
      }
      setMessage('系统配置已保存');
      await fetchConfigs();
    } catch (err) {
      setError('网络错误，无法保存系统配置');
    } finally {
      setSaving(false);
    }
  };

  const configCount = useMemo(() => Object.keys(configs).filter((key) => configs[key] !== '').length, [configs]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="系统设置"
        title="系统配置"
        description="维护 system_configs 表中的站点名称 site_name、默认币种、库存阈值和订单超时等后台基础参数。"
        breadcrumbs={[{ label: '后台', href: '/admin/dashboard' }, { label: '系统配置' }]}
        action={<button onClick={fetchConfigs} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">重新加载</button>}
      />

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <AdminCard title="配置项"><p className="mt-2 text-3xl font-semibold text-slate-950">{configCount}</p></AdminCard>
        <AdminCard title="默认币种"><p className="mt-2 text-3xl font-semibold text-blue-600">{configs.default_currency || '-'}</p></AdminCard>
        <AdminCard title="加载状态"><p className="mt-2 text-sm font-semibold text-slate-600">{loading ? '读取中' : '已同步'}</p></AdminCard>
      </div>

      <AdminCard title="基础配置" description="建议只把真正需要跨模块读取的配置放在这里，避免配置中心变成杂物箱。">
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-600"><span className="font-medium">站点名称 site_name</span><input value={configs.site_name || ''} onChange={(e) => updateConfig('site_name', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-300" /></label>
          <label className="space-y-2 text-sm text-slate-600"><span className="font-medium">客服邮箱</span><input value={configs.support_email || ''} onChange={(e) => updateConfig('support_email', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-300" /></label>
          <label className="space-y-2 text-sm text-slate-600"><span className="font-medium">客服电话</span><input value={configs.support_phone || ''} onChange={(e) => updateConfig('support_phone', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-300" /></label>
          <label className="space-y-2 text-sm text-slate-600"><span className="font-medium">默认币种</span><input value={configs.default_currency || ''} onChange={(e) => updateConfig('default_currency', e.target.value.toUpperCase())} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-300" /></label>
          <label className="space-y-2 text-sm text-slate-600"><span className="font-medium">订单超时分钟</span><input value={configs.order_timeout_minutes || ''} onChange={(e) => updateConfig('order_timeout_minutes', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-300" /></label>
          <label className="space-y-2 text-sm text-slate-600"><span className="font-medium">低库存阈值</span><input value={configs.low_stock_threshold || ''} onChange={(e) => updateConfig('low_stock_threshold', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-300" /></label>
        </div>
        <div className="mt-6 flex gap-3">
          <button disabled={saving} onClick={saveConfigs} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? '保存中...' : '保存系统配置'}</button>
          <button onClick={fetchConfigs} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">取消修改</button>
        </div>
      </AdminCard>
    </div>
  );
}
