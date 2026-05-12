"use client";

import { useEffect, useMemo, useState } from 'react';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminTable } from '@/components/admin/ui/admin-table';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { StatusBadge } from '@/components/admin/ui/status-badge';

interface CouponRow {
  id: number;
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  start_date: string;
  end_date: string;
  usage_limit?: number | null;
  is_active: number;
  claimed_count: number;
  used_count: number;
}

const defaultForm = {
  code: '',
  name: '',
  type: 'percentage',
  value: '10',
  start_date: '',
  end_date: '',
  usage_limit: '',
  description: '',
};

function formatDiscount(item: CouponRow) {
  return item.type === 'percentage' ? `${item.value}%` : `AED ${Number(item.value || 0).toFixed(2)}`;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL('/api/admin/coupons', window.location.origin);
      url.searchParams.set('limit', '100');
      if (keyword.trim()) url.searchParams.set('search', keyword.trim());
      if (status !== 'all') url.searchParams.set('status', status);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '获取优惠券失败');
        return;
      }
      setCoupons(data.data?.coupons || []);
    } catch (err) {
      setError('网络错误，无法获取优惠券');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadCoupons = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = new URL('/api/admin/coupons', window.location.origin);
        url.searchParams.set('limit', '100');
        if (status !== 'all') url.searchParams.set('status', status);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (!data.success) {
          setError(data.error || '获取优惠券失败');
          return;
        }
        setCoupons(data.data?.coupons || []);
      } catch (err) {
        setError('网络错误，无法获取优惠券');
      } finally {
        setLoading(false);
      }
    };

    void loadCoupons();
  }, [status]);

  const createCoupon = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        type: form.type,
        value: Number(form.value),
        start_date: form.start_date,
        end_date: form.end_date,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        description: form.description || null,
        is_active: true,
      };
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '创建优惠券失败');
        return;
      }
      setMessage('优惠券创建成功');
      setShowCreate(false);
      setForm(defaultForm);
      await fetchCoupons();
    } catch (err) {
      setError('网络错误，无法创建优惠券');
    } finally {
      setSaving(false);
    }
  };

  const toggleCoupon = async (id: number) => {
    if (!window.confirm('确认切换该优惠券启停状态吗？')) return;
    try {
      setError(null);
      const res = await fetch(`/api/admin/coupons/${id}/toggle`, { method: 'PUT' });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '切换优惠券状态失败');
        return;
      }
      setMessage('优惠券状态已更新');
      await fetchCoupons();
    } catch (err) {
      setError('网络错误，无法切换优惠券状态');
    }
  };

  const metrics = useMemo(() => {
    const active = coupons.filter((item) => Number(item.is_active) === 1).length;
    const inactive = coupons.length - active;
    const claimed = coupons.reduce((sum, item) => sum + Number(item.claimed_count || 0), 0);
    const used = coupons.reduce((sum, item) => sum + Number(item.used_count || 0), 0);
    return { active, inactive, claimed, used };
  }, [coupons]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="营销中心"
        title="优惠券管理"
        description="管理优惠券投放、启停状态、领取量 claimed_count 与核销量 used_count。"
        breadcrumbs={[{ label: '后台', href: '/admin/dashboard' }, { label: '优惠券管理' }]}
        action={<button onClick={() => setShowCreate((value) => !value)} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">{showCreate ? '收起创建' : '创建优惠券'}</button>}
      />

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <AdminCard title="启用中"><p className="mt-2 text-3xl font-semibold text-emerald-600">{metrics.active}</p></AdminCard>
        <AdminCard title="已停用"><p className="mt-2 text-3xl font-semibold text-slate-500">{metrics.inactive}</p></AdminCard>
        <AdminCard title="累计领取"><p className="mt-2 text-3xl font-semibold text-blue-600">{metrics.claimed}</p></AdminCard>
        <AdminCard title="累计核销"><p className="mt-2 text-3xl font-semibold text-purple-600">{metrics.used}</p></AdminCard>
      </div>

      {showCreate ? (
        <AdminCard title="创建优惠券" description="创建后会写入 coupons 表，前台领取与使用逻辑继续读取同一张表。">
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="优惠券代码" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="优惠券名称" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300"><option value="percentage">百分比</option><option value="fixed">固定金额</option></select>
            <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="优惠值" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
            <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
            <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
            <input value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} placeholder="领取上限，可为空" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="描述" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
          </div>
          <div className="mt-4 flex gap-3">
            <button disabled={saving} onClick={createCoupon} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? '创建中...' : '保存优惠券'}</button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">取消</button>
          </div>
        </AdminCard>
      ) : null}

      <FilterBar action={<button onClick={fetchCoupons} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">刷新列表</button>}>
        <div className="grid gap-3 md:grid-cols-3">
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void fetchCoupons(); }} placeholder="搜索代码 / 名称" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300"><option value="all">全部状态</option><option value="active">启用</option><option value="inactive">停用</option></select>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">建议按活动周期定期清理过期优惠券，避免无效营销配置堆积。</div>
        </div>
      </FilterBar>

      <AdminTable
        loading={loading}
        data={coupons}
        rowKey={(item) => item.id}
        emptyTitle="暂无优惠券"
        emptyDescription="可以创建第一张后台优惠券。"
        columns={[
          { key: 'name', title: '优惠券', render: (item) => <div><div className="font-medium text-slate-950">{item.name}</div><div className="text-xs text-slate-500">{item.code}</div></div> },
          { key: 'discount', title: '优惠', render: (item) => <span className="font-semibold text-slate-900">{formatDiscount(item)}</span> },
          { key: 'status', title: '状态', render: (item) => <StatusBadge tone={Number(item.is_active) === 1 ? 'success' : 'neutral'}>{Number(item.is_active) === 1 ? '启用' : '停用'}</StatusBadge> },
          { key: 'usage', title: '领取 / 核销', render: (item) => <span className="text-sm text-slate-700">{item.claimed_count} / {item.used_count}</span> },
          { key: 'period', title: '有效期', render: (item) => <div className="text-xs text-slate-500"><div>{item.start_date}</div><div>{item.end_date}</div></div> },
          { key: 'actions', title: '操作', align: 'right', render: (item) => <button onClick={() => toggleCoupon(item.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{Number(item.is_active) === 1 ? '停用' : '启用'}</button> },
        ]}
      />
    </div>
  );
}
