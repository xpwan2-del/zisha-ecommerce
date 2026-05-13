"use client";

import { useEffect, useMemo, useState } from 'react';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminTable } from '@/components/admin/ui/admin-table';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { StatusBadge } from '@/components/admin/ui/status-badge';

interface AuditLogRow {
  id: number;
  module: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  description: string;
  operator: string;
  status: string;
  risk_level: string;
  ip_address?: string;
  created_at: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL('/api/admin/settings/audit-logs', window.location.origin);
      url.searchParams.set('limit', '100');
      if (moduleFilter) url.searchParams.set('module', moduleFilter);
      if (statusFilter) url.searchParams.set('status', statusFilter);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '获取审计日志失败');
        return;
      }
      setLogs(data.data?.logs || []);
    } catch (err) {
      setError('网络错误，无法获取审计日志');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = new URL('/api/admin/settings/audit-logs', window.location.origin);
        url.searchParams.set('limit', '100');
        if (moduleFilter) url.searchParams.set('module', moduleFilter);
        if (statusFilter) url.searchParams.set('status', statusFilter);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (!data.success) {
          setError(data.error || '获取审计日志失败');
          return;
        }
        setLogs(data.data?.logs || []);
      } catch (err) {
        setError('网络错误，无法获取审计日志');
      } finally {
        setLoading(false);
      }
    };

    void loadLogs();
  }, [moduleFilter, statusFilter]);

  const filteredLogs = useMemo(() => {
    if (!keyword.trim()) return logs;
    const lowered = keyword.toLowerCase();
    return logs.filter((item) => [item.module, item.action, item.description, item.operator, item.resource_id]
      .some((value) => String(value || '').toLowerCase().includes(lowered)));
  }, [keyword, logs]);

  const highRisk = logs.filter((item) => item.risk_level === 'high' || item.risk_level === 'critical').length;
  const failed = logs.filter((item) => item.status !== 'success').length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="系统设置"
        title="审计日志"
        description="查看后台关键操作、风险等级 risk_level、操作者和资源定位，用于追踪敏感变更。"
        breadcrumbs={[{ label: '后台', href: '/admin/dashboard' }, { label: '审计日志' }]}
        action={<button onClick={fetchLogs} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">刷新</button>}
      />

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <AdminCard title="日志数量"><p className="mt-2 text-3xl font-semibold text-slate-950">{logs.length}</p></AdminCard>
        <AdminCard title="高风险"><p className="mt-2 text-3xl font-semibold text-rose-600">{highRisk}</p></AdminCard>
        <AdminCard title="失败操作"><p className="mt-2 text-3xl font-semibold text-amber-600">{failed}</p></AdminCard>
      </div>

      <FilterBar>
        <div className="grid gap-3 md:grid-cols-3">
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索操作 / 描述 / 操作者" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300"><option value="">全部模块</option><option value="PAYMENTS">PAYMENTS</option><option value="ORDERS">ORDERS</option><option value="API">API</option><option value="USERS">USERS</option></select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300"><option value="">全部状态</option><option value="success">success</option><option value="failed">failed</option></select>
        </div>
      </FilterBar>

      <AdminCard>
        <AdminTable
          loading={loading}
          data={filteredLogs}
          rowKey={(item) => item.id}
          emptyTitle="暂无审计日志"
          emptyDescription="后台操作审计会在这里展示。"
          columns={[
            { key: 'module', title: '模块 / 动作', render: (item) => <div><div className="font-semibold text-slate-950">{item.module}</div><div className="text-xs text-slate-500">{item.action}</div></div> },
            { key: 'description', title: '描述', render: (item) => <div><div className="text-sm text-slate-700">{item.description}</div><div className="text-xs text-slate-400">{item.resource_type || '-'} #{item.resource_id || '-'}</div></div> },
            { key: 'risk', title: '风险', render: (item) => <StatusBadge tone={item.risk_level === 'high' || item.risk_level === 'critical' ? 'danger' : item.risk_level === 'medium' ? 'warning' : 'neutral'}>{item.risk_level || 'low'}</StatusBadge> },
            { key: 'status', title: '状态', render: (item) => <StatusBadge tone={item.status === 'success' ? 'success' : 'danger'}>{item.status}</StatusBadge> },
            { key: 'operator', title: '操作者', render: (item) => <span className="text-sm text-slate-600">{item.operator || 'system'}</span> },
            { key: 'created_at', title: '时间', render: (item) => <span className="text-xs text-slate-500">{item.created_at}</span> },
          ]}
        />
      </AdminCard>
    </div>
  );
}
