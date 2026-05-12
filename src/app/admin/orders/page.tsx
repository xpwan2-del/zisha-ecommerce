"use client";

import { useEffect, useState, useCallback } from 'react';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { OrderActionBar } from '@/components/admin/orders/OrderActionBar';
import { OrderDetailPanel } from '@/components/admin/orders/OrderDetailPanel';
import { OrderStatusBadge } from '@/components/admin/orders/OrderStatusBadge';

interface AdminOrder {
  id: number;
  order_number: string;
  order_status: string;
  payment_status: string;
  payment_method?: string;
  final_amount: number;
  total_original_price?: number;
  shipping_fee?: number;
  user_name?: string;
  user_email?: string;
  created_at: string;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (targetPage = pagination.page) => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(pagination.limit));
      if (search) params.set('search', search);
      if (orderStatus) params.set('orderStatus', orderStatus);
      if (paymentStatus) params.set('paymentStatus', paymentStatus);

      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        setError(result.error || '获取订单失败');
        return;
      }

      setOrders(result.data.orders || []);
      setPagination(result.data.pagination || { page: targetPage, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      setError('网络错误，无法获取订单');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, orderStatus, paymentStatus]);

  const fetchOrderDetail = useCallback(async (orderId: number) => {
    try {
      setSelectedOrderId(orderId);
      setDetail(null);
      setError(null);
      const response = await fetch(`/api/admin/orders/${orderId}`);
      const result = await response.json();

      if (!result.success) {
        setError(result.error || '获取订单详情失败');
        return;
      }

      setDetail(result.data);
    } catch (err) {
      setError('网络错误，无法获取订单详情');
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const refreshCurrent = async () => {
    await fetchOrders(pagination.page);
    if (selectedOrderId) await fetchOrderDetail(selectedOrderId);
  };

  const shipOrder = async () => {
    if (!detail?.order) return;
    const carrier = window.prompt('请输入物流公司');
    if (!carrier) return;
    const trackingNumber = window.prompt('请输入物流单号');
    if (!trackingNumber) return;

    await submitAction(`/api/admin/orders/${detail.order.id}/ship`, {
      tracking_number: trackingNumber,
      carrier,
    });
  };

  const approveRefund = async () => {
    if (!detail?.order) return;
    if (!window.confirm('确认同意该订单退款申请？')) return;
    await submitAction(`/api/admin/orders/${detail.order.id}/refund/approve`, {});
  };

  const rejectRefund = async () => {
    if (!detail?.order) return;
    const reason = window.prompt('请输入拒绝退款原因') || '管理员拒绝退款';
    await submitAction(`/api/admin/orders/${detail.order.id}/refund/reject`, { reason });
  };

  const handleRetryRefund = async () => {
    if (!detail?.order) return;
    if (!window.confirm('确认重试该订单退款？')) return;
    const orderId = detail.order.id;
    await submitAction(`/api/admin/orders/${orderId}/refund/retry`, {});
  };

  const submitAction = async (url: string, body: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setMessage(null);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || '操作失败');
        return;
      }

      setMessage(result.data?.message || '操作成功');
      await refreshCurrent();
    } catch (err) {
      setError('网络错误，操作失败');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setOrderStatus('');
    setPaymentStatus('');
    setPagination((prev) => ({ ...prev, page: 1 }));
    setTimeout(() => fetchOrders(1), 0);
  };

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader
          title="订单中心"
          description="统一处理订单查询、发货、退款审批和订单状态追踪，所有状态变更必须走后台状态机。"
        />

        {message ? <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
        {error ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <AdminCard className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="订单号 / 用户邮箱 / 用户名"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2"
            />
            <select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">全部订单状态</option>
              <option value="pending">待付款</option>
              <option value="paid">待发货</option>
              <option value="shipped">待收货</option>
              <option value="refunding_payment">待处理退款</option>
              <option value="refunding">退款中</option>
              <option value="delivered">待评价</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
              <option value="refunded">已退款</option>
            </select>
            <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">全部支付状态</option>
              <option value="unpaid">未支付</option>
              <option value="pending">支付中</option>
              <option value="paid">已支付</option>
              <option value="refunding">退款中</option>
              <option value="refunded">已退款</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => fetchOrders(1)} className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">查询</button>
              <button onClick={resetFilters} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">重置</button>
            </div>
          </div>
        </AdminCard>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
          <AdminCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">订单号</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">用户</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">金额</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">创建时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {orders.map((order) => (
                    <tr key={order.id} className={selectedOrderId === order.id ? 'bg-blue-50' : ''}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.order_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div>{order.user_name || '-'}</div>
                        <div className="text-xs text-gray-400">{order.user_email || '-'}</div>
                      </td>
                      <td className="space-y-1 px-4 py-3 text-sm">
                        <OrderStatusBadge status={order.order_status} />
                        <div><OrderStatusBadge status={order.payment_status} type="payment" /></div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">¥{Number(order.final_amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.created_at}</td>
                      <td className="px-4 py-3 text-sm">
                        <button onClick={() => fetchOrderDetail(order.id)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">查看</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
              <span>共 {pagination.total} 条，第 {pagination.page} / {pagination.totalPages || 1} 页</span>
              <div className="flex gap-2">
                <button disabled={pagination.page <= 1 || isLoading} onClick={() => fetchOrders(pagination.page - 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:text-gray-300">上一页</button>
                <button disabled={pagination.page >= pagination.totalPages || isLoading} onClick={() => fetchOrders(pagination.page + 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:text-gray-300">下一页</button>
              </div>
            </div>
          </AdminCard>

          <div className="space-y-4">
            <OrderActionBar
              order={detail?.order || null}
              refundRetry={detail?.refundRetry || null}
              isSubmitting={isSubmitting}
              onShip={shipOrder}
              onApproveRefund={approveRefund}
              onRejectRefund={rejectRefund}
              onRetryRefund={handleRetryRefund}
            />
            {detail ? (
              <OrderDetailPanel
                order={detail.order}
                items={detail.items || []}
                statusLogs={detail.statusLogs || []}
                payments={detail.payments || []}
                logistics={detail.logistics || []}
                coupons={detail.coupons || []}
                inventoryTransactions={detail.inventoryTransactions || []}
                auditLogs={detail.auditLogs || []}
                releaseRecords={detail.releaseRecords || []}
                refundRetry={detail.refundRetry || null}
              />
            ) : (
              <AdminCard className="p-6 text-sm text-gray-500">请选择左侧订单查看详情和可执行动作。</AdminCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
