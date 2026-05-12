"use client";

import { useEffect, useMemo, useState } from 'react';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminTable } from '@/components/admin/ui/admin-table';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { OrderStatusBadge } from '@/components/admin/orders/OrderStatusBadge';

interface PaymentOrderRow {
  id: number;
  order_number: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  final_amount: number;
  user_name?: string;
  user_email?: string;
  created_at: string;
  updated_at: string;
}

export default function PaymentOrdersPage() {
  const [orders, setOrders] = useState<PaymentOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = new URL('/api/admin/payments/orders', window.location.origin);
        url.searchParams.set('limit', '50');
        if (statusFilter) url.searchParams.set('status', statusFilter);

        const res = await fetch(url.toString());
        const data = await res.json();
        if (!data.success) {
          setError(data.error || '获取支付流水失败');
          return;
        }
        setOrders(data.data?.orders || []);
      } catch (err) {
        setError('网络错误，无法获取支付流水');
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL('/api/admin/payments/orders', window.location.origin);
      url.searchParams.set('limit', '50');
      if (statusFilter) url.searchParams.set('status', statusFilter);
      if (keyword) url.searchParams.set('search', keyword);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '获取支付流水失败');
        return;
      }
      setOrders(data.data?.orders || []);
    } catch (err) {
      setError('网络错误，无法获取支付流水');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (orderNumber: string) => {
    try {
      setRetrying(orderNumber);
      setError(null);
      const res = await fetch('/api/admin/payments/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '发起重试失败');
        return;
      }
      setMessage(`订单 ${orderNumber} 的支付重试请求已成功提交`);
      setTimeout(() => setMessage(null), 3000);
      await fetchOrders();
    } catch (err) {
      setError('网络错误，无法发起支付重试');
    } finally {
      setRetrying(null);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!keyword.trim()) return orders;
    const lowered = keyword.toLowerCase();
    return orders.filter((item) => 
      [item.order_number, item.payment_method, item.user_name, item.user_email].some(
        (value) => String(value || '').toLowerCase().includes(lowered)
      )
    );
  }, [keyword, orders]);

  const metrics = useMemo(() => {
    const total = orders.length;
    const paid = orders.filter((item) => item.payment_status === 'paid').length;
    const refunding = orders.filter((item) => item.payment_status === 'refunding' || item.order_status === 'refunding_payment').length;
    const failed = orders.filter((item) => ['failed', 'cancelled', 'timeout'].includes(item.payment_status)).length;
    return { total, paid, refunding, failed };
  }, [orders]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="支付中心"
        title="支付订单流水"
        description="查看订单支付状态、退款进度和支付渠道分布，用于财务核对与运营追踪。"
        breadcrumbs={[{ label: '后台', href: '/admin/dashboard' }, { label: '支付订单流水' }]}
        action={<div className="flex gap-2">
          <a href="/admin/payments/refunds" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">退款流水视图</a>
          <a href="/admin/payments/logs" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">查看回调日志</a>
        </div>}
      />

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <AdminCard title="订单总数"><p className="mt-2 text-3xl font-semibold text-slate-950">{metrics.total}</p></AdminCard>
        <AdminCard title="已支付"><p className="mt-2 text-3xl font-semibold text-emerald-600">{metrics.paid}</p></AdminCard>
        <AdminCard title="退款中"><p className="mt-2 text-3xl font-semibold text-purple-600">{metrics.refunding}</p></AdminCard>
        <AdminCard title="支付异常/失败"><p className="mt-2 text-3xl font-semibold text-rose-600">{metrics.failed}</p></AdminCard>
      </div>

      <FilterBar action={<button onClick={fetchOrders} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">刷新流水</button>}>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">搜索</span>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchOrders()} placeholder="订单号 / 渠道 / 用户" className="rounded-lg border border-slate-200 px-3 py-2 outline-none transition-colors focus:border-blue-300" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">状态筛选</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none transition-colors focus:border-blue-300">
              <option value="">全部状态</option>
              <option value="pending">待付款</option>
              <option value="paid">已支付</option>
              <option value="failed">支付失败</option>
              <option value="refunding">退款中</option>
              <option value="refunded">已退款</option>
            </select>
          </label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">操作提示</p>
            <p className="mt-2 text-sm text-slate-700">异常订单可点击“重试支付”记录审计。如需退款请前往“退款流水视图”。</p>
          </div>
        </div>
      </FilterBar>

      <AdminTable
        loading={loading}
        data={filteredOrders}
        rowKey={(item) => item.id}
        emptyTitle="暂无支付流水"
        emptyDescription="当前筛选条件下没有可展示的支付记录。"
        columns={[
          { key: 'order', title: '订单号', render: (item) => <div><div className="font-medium text-slate-950">{item.order_number}</div><div className="text-xs text-slate-500">{item.payment_method}</div></div> },
          { key: 'user', title: '用户', render: (item) => <div className="max-w-[150px] truncate text-slate-600" title={item.user_email}>{item.user_name || item.user_email || '-'}</div> },
          { key: 'payment_status', title: '支付状态', render: (item) => <OrderStatusBadge type="payment" status={item.payment_status} /> },
          { key: 'order_status', title: '订单状态', render: (item) => <OrderStatusBadge status={item.order_status} /> },
          { key: 'amount', title: '金额', align: 'right', render: (item) => <span className="font-medium text-slate-950">¥{item.final_amount.toFixed(2)}</span> },
          { 
            key: 'actions', 
            title: '操作', 
            align: 'right', 
            render: (item) => {
              const isRetryable = ['failed', 'cancelled', 'timeout', 'unpaid'].includes(String(item.payment_status || '').toLowerCase()) || item.order_status === 'pending';
              return isRetryable ? (
                <button 
                  onClick={() => handleRetry(item.order_number)}
                  disabled={retrying === item.order_number}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {retrying === item.order_number ? '处理中' : '重试支付'}
                </button>
              ) : (
                <span className="text-xs text-slate-400">无需操作</span>
              );
            }
          },
        ]}
      />
    </div>
  );
}
