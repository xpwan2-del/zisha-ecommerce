"use client";

import { useEffect, useMemo, useState } from 'react';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminTable } from '@/components/admin/ui/admin-table';
import { StatusBadge } from '@/components/admin/ui/status-badge';

interface ExchangeRateRow {
  currency: string;
  rate_to_usd: number;
  updated_at: string;
}

export default function ExchangeRatesPage() {
  const [rates, setRates] = useState<ExchangeRateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [currency, setCurrency] = useState('AED');
  const [rateToUsd, setRateToUsd] = useState('0.2723');

  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/settings/exchange-rates');
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '获取汇率失败');
        return;
      }
      setRates(data.data || []);
    } catch (err) {
      setError('网络错误，无法获取汇率');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRates();
  }, []);

  const saveRate = async () => {
    if (!window.confirm('汇率会影响支付与订单金额展示，确认保存吗？')) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch('/api/admin/settings/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency, rate_to_usd: Number(rateToUsd) }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '保存汇率失败');
        return;
      }
      setMessage('汇率已保存');
      await fetchRates();
    } catch (err) {
      setError('网络错误，无法保存汇率');
    } finally {
      setSaving(false);
    }
  };

  const deleteRate = async (code: string) => {
    if (!window.confirm(`确认删除 ${code} 汇率吗？`)) return;
    const res = await fetch(`/api/admin/settings/exchange-rates?currency=${encodeURIComponent(code)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
      setError(data.error || '删除汇率失败');
      return;
    }
    setMessage('汇率已删除');
    await fetchRates();
  };

  const usdRate = useMemo(() => rates.find((item) => item.currency === 'USD')?.rate_to_usd || 1, [rates]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="系统设置"
        title="汇率设置"
        description="维护 exchange_rates 表中的 rate_to_usd，供多币种金额换算和后台财务核对使用。"
        breadcrumbs={[{ label: '后台', href: '/admin/dashboard' }, { label: '汇率设置' }]}
        action={<button onClick={fetchRates} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">刷新</button>}
      />

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <AdminCard title="币种数量"><p className="mt-2 text-3xl font-semibold text-slate-950">{rates.length}</p></AdminCard>
        <AdminCard title="USD 基准"><p className="mt-2 text-3xl font-semibold text-emerald-600">{usdRate}</p></AdminCard>
        <AdminCard title="状态"><StatusBadge tone="success">实时配置</StatusBadge></AdminCard>
      </div>

      <AdminCard title="新增或更新汇率" description="currency 会自动转为大写；同币种保存会覆盖旧值。">
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="Currency" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
          <input value={rateToUsd} onChange={(e) => setRateToUsd(e.target.value)} placeholder="rate_to_usd" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
          <button disabled={saving} onClick={saveRate} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? '保存中...' : '保存汇率'}</button>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminTable
          loading={loading}
          data={rates}
          rowKey={(item) => item.currency}
          emptyTitle="暂无汇率"
          emptyDescription="请先添加一个币种汇率。"
          columns={[
            { key: 'currency', title: '币种', render: (item) => <span className="font-semibold text-slate-950">{item.currency}</span> },
            { key: 'rate', title: 'rate_to_usd', render: (item) => <span>{Number(item.rate_to_usd).toFixed(6)}</span> },
            { key: 'updated_at', title: '更新时间', render: (item) => <span className="text-sm text-slate-500">{item.updated_at}</span> },
            { key: 'actions', title: '操作', align: 'right', render: (item) => <button onClick={() => deleteRate(item.currency)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">删除</button> },
          ]}
        />
      </AdminCard>
    </div>
  );
}
