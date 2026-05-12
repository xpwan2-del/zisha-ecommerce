"use client";

import { useEffect, useMemo, useState } from 'react';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { StatusBadge } from '@/components/admin/ui/status-badge';

interface PaymentConfig {
  payment_method: string;
  display_name: string;
  is_enabled: number;
  is_sandbox: number;
  sort_order: number;
  config_json?: Record<string, any>;
}

interface PaymentConfigForm {
  payment_method: string;
  display_name: string;
  is_enabled: boolean;
  is_sandbox: boolean;
  sort_order: string;
  config_json: string;
}

export default function PaymentsPage() {
  const [configs, setConfigs] = useState<PaymentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<PaymentConfigForm | null>(null);

  useEffect(() => {
    void fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/settings/payment');
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '获取支付配置失败');
        return;
      }
      setConfigs((data.data || []).map((item: any) => ({
        payment_method: item.payment_method,
        display_name: item.display_name,
        is_enabled: Number(item.is_enabled || 0),
        is_sandbox: Number(item.is_sandbox || 0),
        sort_order: Number(item.sort_order || 0),
        config_json: item.config_json || {},
      })));
    } catch (err) {
      setError('网络错误，无法获取支付配置');
    } finally {
      setLoading(false);
    }
  };

  const openEditForm = (config: PaymentConfig) => {
    setEditingConfig({
      payment_method: config.payment_method,
      display_name: config.display_name,
      is_enabled: config.is_enabled === 1,
      is_sandbox: config.is_sandbox === 1,
      sort_order: String(config.sort_order || 0),
      config_json: JSON.stringify(config.config_json || {}, null, 2),
    });
    setMessage(null);
    setError(null);
  };

  const saveConfig = async () => {
    if (!editingConfig) return;
    let parsedConfig: Record<string, any> = {};
    try {
      parsedConfig = editingConfig.config_json.trim() ? JSON.parse(editingConfig.config_json) : {};
    } catch (err) {
      setError('配置 JSON 格式不正确，请检查后再保存');
      return;
    }

    if (!window.confirm('支付配置属于高风险配置，确认保存当前修改吗？')) return;

    try {
      setSaving(true);
      setError(null);
      const res = await fetch('/api/admin/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: editingConfig.payment_method,
          display_name: editingConfig.display_name,
          is_enabled: editingConfig.is_enabled,
          is_sandbox: editingConfig.is_sandbox,
          sort_order: Number(editingConfig.sort_order || 0),
          config_json: parsedConfig,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '保存支付配置失败');
        return;
      }
      setMessage('保存设置成功，支付通道配置已更新');
      setEditingConfig(null);
      await fetchConfigs();
    } catch (err) {
      setError('网络错误，无法保存支付配置');
    } finally {
      setSaving(false);
    }
  };

  const metrics = useMemo(() => {
    const total = configs.length;
    const enabled = configs.filter((item) => item.is_enabled === 1).length;
    const sandbox = configs.filter((item) => item.is_sandbox === 1).length;
    const production = configs.filter((item) => item.is_enabled === 1 && item.is_sandbox === 0).length;
    return { total, enabled, sandbox, production };
  }, [configs]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="支付中心"
        title="支付配置中心"
        description="统一管理各支付通道的启用状态、沙箱模式、配置参数和风控开关。"
        breadcrumbs={[{ label: '后台', href: '/admin/dashboard' }, { label: '支付配置中心' }]}
        action={<a href="/admin/payments/orders" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">查看支付流水</a>}
      />

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <AdminCard title="通道总数"><p className="mt-2 text-3xl font-semibold text-slate-950">{metrics.total}</p><p className="mt-1 text-xs text-slate-500">当前已配置支付通道</p></AdminCard>
        <AdminCard title="已启用"><p className="mt-2 text-3xl font-semibold text-emerald-600">{metrics.enabled}</p><p className="mt-1 text-xs text-slate-500">可用于前台下单</p></AdminCard>
        <AdminCard title="沙箱模式"><p className="mt-2 text-3xl font-semibold text-amber-600">{metrics.sandbox}</p><p className="mt-1 text-xs text-slate-500">测试环境通道</p></AdminCard>
        <AdminCard title="生产可用"><p className="mt-2 text-3xl font-semibold text-blue-600">{metrics.production}</p><p className="mt-1 text-xs text-slate-500">启用且非沙箱</p></AdminCard>
      </div>

      <FilterBar action={<button onClick={fetchConfigs} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">刷新配置</button>}>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">当前页面</p><p className="mt-2 text-sm font-medium text-slate-950">支付通道配置</p></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">风险配置</p><p className="mt-2 text-sm font-medium text-slate-950">修改后会写入管理员审计日志</p></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">编辑配置</p><p className="mt-2 text-sm font-medium text-slate-950">支持通道开关、环境和扩展 JSON 参数</p></div>
        </div>
      </FilterBar>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="space-y-3 p-6">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : configs.length ? (
            configs.map((config) => (
              <div key={config.payment_method} className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-semibold text-slate-950">{config.display_name}</h3>
                    <StatusBadge tone={config.is_enabled === 1 ? 'success' : 'neutral'}>{config.is_enabled === 1 ? '启用' : '停用'}</StatusBadge>
                    <StatusBadge tone={config.is_sandbox === 1 ? 'warning' : 'info'}>{config.is_sandbox === 1 ? '沙箱' : '生产'}</StatusBadge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">通道标识：{config.payment_method} · 排序：{config.sort_order}</p>
                </div>
                <div className="flex flex-col gap-3 md:items-end">
                  <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">状态</p><p className="mt-1 font-medium text-slate-950">{config.is_enabled === 1 ? '已启用' : '已停用'}</p></div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">环境</p><p className="mt-1 font-medium text-slate-950">{config.is_sandbox === 1 ? '沙箱模式' : '生产模式'}</p></div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">配置摘要</p><p className="mt-1 font-medium text-slate-950">{Object.keys(config.config_json || {}).length ? `${Object.keys(config.config_json || {}).length} 项参数` : '未配置扩展参数'}</p></div>
                  </div>
                  <button onClick={() => openEditForm(config)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">编辑配置</button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-sm text-slate-500">暂无支付配置数据。</div>
          )}
        </div>
      </div>

      {editingConfig ? (
        <AdminCard title={`编辑配置：${editingConfig.display_name || editingConfig.payment_method}`}>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-600"><span>显示名称</span><input value={editingConfig.display_name} onChange={(e) => setEditingConfig({ ...editingConfig, display_name: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 outline-none transition-colors focus:border-blue-300" /></label>
            <label className="flex flex-col gap-2 text-sm text-slate-600"><span>排序</span><input value={editingConfig.sort_order} onChange={(e) => setEditingConfig({ ...editingConfig, sort_order: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 outline-none transition-colors focus:border-blue-300" /></label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><input type="checkbox" checked={editingConfig.is_enabled} onChange={(e) => setEditingConfig({ ...editingConfig, is_enabled: e.target.checked })} />启用通道</label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><input type="checkbox" checked={editingConfig.is_sandbox} onChange={(e) => setEditingConfig({ ...editingConfig, is_sandbox: e.target.checked })} />沙箱模式</label>
            <label className="flex flex-col gap-2 text-sm text-slate-600 md:col-span-2"><span>扩展配置 JSON</span><textarea value={editingConfig.config_json} onChange={(e) => setEditingConfig({ ...editingConfig, config_json: e.target.value })} rows={8} className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none transition-colors focus:border-blue-300" /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={saveConfig} disabled={saving} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60">{saving ? '保存中...' : '保存设置'}</button>
            <button onClick={() => setEditingConfig(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">取消编辑</button>
          </div>
        </AdminCard>
      ) : null}
    </div>
  );
}
