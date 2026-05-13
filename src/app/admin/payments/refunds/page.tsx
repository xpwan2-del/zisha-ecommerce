"use client";

import { useEffect, useMemo, useState } from 'react';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminTable } from '@/components/admin/ui/admin-table';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { OrderStatusBadge } from '@/components/admin/orders/OrderStatusBadge';

interface RefundRow {
  id: number;
  order_number: string;
  payment_method: string;
  order_status: string;
  payment_status: string;
  final_amount: number;
  created_at: string;
  updated_at: string;
}

export default function PaymentRefundsPage() {
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('refunding_payment');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL('/api/admin/payments/refunds', window.location.origin);
      url.searchParams.set('status', statusFilter);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '获取退款流水失败');
        return;
      }
      setRefunds(data.data?.refunds || []);
    } catch (err) {
      setError('网络错误，无法获取退款流水');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadRefunds = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = new URL('/api/admin/payments/refunds', window.location.origin);
        url.searchParams.set('status', statusFilter);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (!data.success) {
          setError(data.error || '获取退款流水失败');
          return;
        }
        setRefunds(data.data?.refunds || []);
      } catch (err) {
        setError('网络错误，无法获取退款流水');
      } finally {
        setLoading(false);
      }
    };

    void loadRefunds();
  }, [statusFilter]);

  const handleRefundAction = async (orderId: number, action: 'approve' | 'reject' | 'retry') => {
    const actionText = action === 'approve' ? '同意退款' : action === 'reject' ? '拒绝退款' : '重试退款';
    if (!window.confirm(`确认要${actionText}该订单吗？`)) return;

    try {
      setActionLoading(orderId);
      setError(null);
      const res = await fetch(`/api/admin/orders/${orderId}/refund/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: actionText }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || `${actionText}失败`);
        return;
      }
      await fetchRefunds();
    } catch (err) {
      setError(`${actionText}请求失败`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRefunds = useMemo(() => {
    if (!keyword.trim()) return refunds;
    const lowered = keyword.toLowerCase();
    return refunds.filter((item) => [item.order_number, item.payment_method, item.order_status, item.payment_status]
      .some((value) => String(value || '').toLowerCase().includes(lowered)));
  }, [keyword, refunds]);

  const metrics = useMemo(() => {
    const total = refunds.length;
    const refunding = refunds.filter((item) => item.order_status === 'refunding').length;
    const refunded = refunds.filter((item) => item.order_status === 'refunded').length;
    const pending = refunds.filter((item) => item.order_status === 'refunding_payment').length;
    return { total, refunding, refunded, pending };
  }, [refunds]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="支付中心"
        title="退款流水视图"
        description="集中处理退款审核、退款重试和退款终态追踪，确保退款必须经过后台审批闭环。"
        breadcrumbs={[{ label: '后台', href: '/admin/dashboard' }, { label: '退款流水视图' }]}
        action={<a href="/admin/payments/orders" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">返回支付流水</a>}
      />

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <AdminCard title="退款总数"><p className="mt-2 text-3xl font-semibold text-slate-950">{metrics.total}</p></AdminCard>
        <AdminCard title="审核中"><p className="mt-2 text-3xl font-semibold text-amber-600">{metrics.pending}</p></AdminCard>
        <AdminCard title="退款中"><p className="mt-2 text-3xl font-semibold text-purple-600">{metrics.refunding}</p></AdminCard>
        <AdminCard title="已退款"><p className="mt-2 text-3xl font-semibold text-emerald-600">{metrics.refunded}</p></AdminCard>
      </div>

      <FilterBar action={<button onClick={fetchRefunds} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">刷新退款流水</button>}>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">搜索</span>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="订单号 / 渠道 / 状态" className="rounded-lg border border-slate-200 px-3 py-2 outline-none transition-colors focus:border-blue-300" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">退款状态</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none transition-colors focus:border-blue-300">
              <option value="refunding_payment">待审核</option>
              <option value="refunding">退款中</option>
              <option value="refunded">已退款</option>
              <option value="all">全部</option>
            </select>
          </label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">说明</p>
            <p className="mt-2 text-sm text-slate-700">审核中订单可同意或拒绝，退款中订单可触发重试。</p>
          </div>
        </div>
      </FilterBar>

      <AdminTable
        loading={loading}
        data={filteredRefunds}
        rowKey={(item) => item.id}
        emptyTitle="暂无退款流水"
        emptyDescription="当前没有符合筛选条件的退款订单。"
        columns={[
          { key: 'order', title: '订单号', render: (item) => <div><div className="font-medium text-slate-950">{item.order_number}</div><div className="text-xs text-slate-500">{item.payment_method}</div></div> },
          { key: 'status', title: '退款状态', render: (item) => <OrderStatusBadge status={item.order_status} /> },
          { key: 'payment_status', title: '支付状态', render: (item) => <OrderStatusBadge type="payment" status={item.payment_status} /> },
          { key: 'amount', title: '金额', align: 'right', render: (item) => <span className="font-medium text-slate-950">AED {Number(item.final_amount || 0).toFixed(2)}</span> },
          { key: 'actions', title: '操作', align: 'right', render: (item) => (
            <div className="flex flex-wrap justify-end gap-2">
              {item.order_status === 'refunding_payment' ? (
                <>
                  <button disabled={actionLoading === item.id} onClick={() => handleRefundAction(item.id, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">同意</button>
                  <button disabled={actionLoading === item.id} onClick={() => handleRefundAction(item.id, 'reject')} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50">拒绝</button>
                </>
              ) : null}
              {item.order_status === 'refunding' ? (
                <button disabled={actionLoading === item.id} onClick={() => handleRefundAction(item.id, 'retry')} className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50">重试</button>
              ) : null}
            </div>
          ) },
        ]}
      />
    </div>
  );
}
