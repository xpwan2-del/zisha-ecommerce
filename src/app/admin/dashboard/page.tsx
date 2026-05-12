"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  UsersIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  CubeIcon,
  ChartBarIcon,
  BoltIcon,
  TagIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { OrderStatusBadge } from '@/components/admin/orders/OrderStatusBadge';

interface DashboardOrder {
  id: number;
  order_number: string;
  final_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
  user_name?: string;
}

interface DashboardData {
  todayOrders: { count: number; amount: number };
  monthOrders: { count: number; amount: number };
  monthGrowth: string;
  totalUsers: number;
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  pendingOrders: number;
  pendingRefunds: number;
  recentOrders: DashboardOrder[];
}

const defaultDashboardData: DashboardData = {
  todayOrders: { count: 0, amount: 0 },
  monthOrders: { count: 0, amount: 0 },
  monthGrowth: 'N/A',
  totalUsers: 0,
  totalProducts: 0,
  lowStock: 0,
  outOfStock: 0,
  pendingOrders: 0,
  pendingRefunds: 0,
  recentOrders: [],
};

function formatAmount(amount: number) {
  return `AED ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData>(defaultDashboardData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '获取后台看板数据失败');
        return;
      }
      setDashboard({ ...defaultDashboardData, ...(data.data || {}) });
    } catch (err) {
      setError('网络错误，无法获取后台看板数据');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  const stats = useMemo(() => [
    {
      label: '今日销售额',
      value: formatAmount(dashboard.todayOrders.amount),
      trend: `${dashboard.todayOrders.count} 单`,
      icon: CurrencyDollarIcon,
      color: 'blue',
    },
    {
      label: '今日新增订单',
      value: String(dashboard.todayOrders.count),
      trend: `待处理 ${dashboard.pendingOrders}`,
      icon: ShoppingBagIcon,
      color: 'emerald',
    },
    {
      label: '用户总数',
      value: String(dashboard.totalUsers),
      trend: `${dashboard.totalProducts} 件商品`,
      icon: UsersIcon,
      color: 'indigo',
    },
    {
      label: '库存预警',
      value: String(dashboard.lowStock + dashboard.outOfStock),
      trend: `缺货 ${dashboard.outOfStock}`,
      icon: CubeIcon,
      color: 'amber',
    },
  ], [dashboard]);

  const quickActions = [
    { name: '发布新产品', href: '/admin/products', icon: PlusIcon, color: 'blue' },
    { name: '处理待发货', href: '/admin/orders', icon: BoltIcon, color: 'emerald' },
    { name: '库存盘点', href: '/admin/inventory/checks', icon: ChartBarIcon, color: 'indigo' },
    { name: '营销活动', href: '/admin/promotions', icon: TagIcon, color: 'rose' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="OVERVIEW"
        title="管理控制台"
        description="基于真实订单、用户、商品和库存数据生成今日运营概览。"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Dashboard' }]}
        action={<button onClick={fetchDashboard} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">刷新数据</button>}
      />

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <AdminCard key={stat.label} className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{loading ? '...' : stat.value}</p>
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-xs font-semibold text-emerald-600">{stat.trend}</span>
                  <span className="text-xs text-slate-400">实时统计</span>
                </div>
              </div>
              <div className={`rounded-2xl p-3 ${
                stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                'bg-amber-50 text-amber-600'
              }`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </AdminCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <AdminCard title="快捷操作" description="常用功能快速入口">
            <div className="mt-4 grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link key={action.name} href={action.href} className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-blue-200 hover:bg-blue-50/50">
                  <div className={`rounded-xl p-2.5 transition group-hover:scale-110 ${
                    action.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                    action.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                    action.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' :
                    'bg-rose-100 text-rose-600'
                  }`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-blue-700">{action.name}</span>
                </Link>
              ))}
            </div>
          </AdminCard>

          <AdminCard title="待处理事项" className="bg-slate-900 text-white">
            <div className="mt-4 space-y-4">
              <Link href="/admin/orders" className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10">
                <span>待付款订单</span><span className="font-semibold text-white">{dashboard.pendingOrders}</span>
              </Link>
              <Link href="/admin/payments/refunds" className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10">
                <span>退款审核</span><span className="font-semibold text-white">{dashboard.pendingRefunds}</span>
              </Link>
              <Link href="/admin/inventory/alerts" className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10">
                <span>库存异常</span><span className="font-semibold text-white">{dashboard.lowStock + dashboard.outOfStock}</span>
              </Link>
            </div>
          </AdminCard>
        </div>

        <div className="lg:col-span-2">
          <AdminCard title="最近订单动态" description="来自订单表的最新交易记录">
            <div className="mt-6 space-y-4">
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>
              ) : dashboard.recentOrders.length ? (
                dashboard.recentOrders.map((order) => (
                  <div key={order.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">订单 #{order.order_number}</p>
                      <p className="mt-1 text-xs text-slate-500">{order.user_name || '未关联用户'} · {order.created_at}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 md:justify-end">
                      <OrderStatusBadge status={order.order_status} />
                      <OrderStatusBadge type="payment" status={order.payment_status} />
                      <span className="text-sm font-semibold text-slate-950">{formatAmount(order.final_amount)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">暂无最近订单。</div>
              )}
              <Link href="/admin/orders" className="block w-full border-t border-slate-100 py-3 text-center text-sm font-semibold text-slate-500 transition hover:text-blue-600">
                查看全部订单
              </Link>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
