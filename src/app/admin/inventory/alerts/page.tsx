"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/ui/admin-table";
import { FilterBar } from "@/components/admin/ui/filter-bar";
import { StatusBadge } from "@/components/admin/ui/status-badge";

interface Alert {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  alert_type: string;
  current_stock: number;
  threshold: number;
  status: "active" | "resolved" | "ignored";
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

export default function InventoryAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("active");
  const [keyword, setKeyword] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL("/api/inventory/alerts", window.location.origin);
      if (filter !== "all") {
        url.searchParams.set("status", filter);
      }

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "获取库存预警失败");
      }

      setAlerts(data.data?.alerts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误，无法获取库存预警");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const filteredAlerts = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return alerts;
    return alerts.filter((item) => {
      const source = `${item.product_name || ""} ${item.sku || ""} ${item.product_id} ${item.resolution_note || ""}`.toLowerCase();
      return source.includes(text);
    });
  }, [alerts, keyword]);

  const metrics = useMemo(() => {
    const active = alerts.filter((item) => item.status === "active").length;
    const resolved = alerts.filter((item) => item.status === "resolved").length;
    const outOfStock = alerts.filter((item) => item.alert_type === "out_of_stock" && item.status === "active").length;
    const lowStock = alerts.filter((item) => item.alert_type === "low_stock" && item.status === "active").length;
    return { active, resolved, outOfStock, lowStock };
  }, [alerts]);

  const resolveAlert = async () => {
    if (!selectedAlert) return;

    try {
      setError(null);
      const res = await fetch(`/api/inventory/alerts/${selectedAlert.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution_note: resolveNote || "管理员已处理该库存预警",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "处理库存预警失败");
      }

      setMessage("预警已处理成功");
      setSelectedAlert(null);
      setResolveNote("");
      await fetchAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "处理失败");
    }
  };

  const getAlertLabel = (type: string) => {
    const labels: Record<string, string> = {
      low_stock: "低库存",
      out_of_stock: "缺货",
      overstock: "库存积压",
    };
    return labels[type] || type;
  };

  const getAlertTone = (type: string): "warning" | "danger" | "info" => {
    if (type === "out_of_stock") return "danger";
    if (type === "low_stock") return "warning";
    return "info";
  };

  const columns = [
    {
      key: "product",
      title: "商品信息",
      render: (item: Alert) => (
        <div>
          <div className="font-medium text-slate-950">{item.product_name || "未知商品"}</div>
          <div className="mt-1 flex gap-2 text-xs text-slate-500">
            <span>ID: {item.product_id}</span>
            {item.sku && <span>SKU: {item.sku}</span>}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      title: "预警类型",
      render: (item: Alert) => (
        <StatusBadge tone={getAlertTone(item.alert_type)}>{getAlertLabel(item.alert_type)}</StatusBadge>
      ),
    },
    {
      key: "stock",
      title: "当前库存 / 阈值",
      render: (item: Alert) => (
        <span className="font-medium text-slate-950">
          {item.current_stock} <span className="mx-1 text-slate-300">/</span> {item.threshold || "-"}
        </span>
      ),
    },
    {
      key: "status",
      title: "状态",
      render: (item: Alert) => (
        <StatusBadge tone={item.status === "resolved" ? "success" : "warning"}>
          {item.status === "resolved" ? "已解决" : "待处理"}
        </StatusBadge>
      ),
    },
    {
      key: "time",
      title: "触发时间",
      render: (item: Alert) => <span className="text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</span>,
    },
    {
      key: "action",
      title: "操作",
      align: "right" as const,
      render: (item: Alert) =>
        item.status === "active" ? (
          <button
            onClick={() => {
              setSelectedAlert(item);
              setResolveNote("");
            }}
            className="font-medium text-blue-700 hover:text-blue-900"
          >
            处理预警
          </button>
        ) : (
          <span className="text-sm text-slate-400">已闭环</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="库存运营"
        title="库存异常处理中心"
        description="系统实时监控库存水位。当库存低于安全阈值或缺货时在此产生工单，由库管人员跟进补货或调整并闭环。"
        action={
          <button
            onClick={fetchAlerts}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            同步预警
          </button>
        }
        breadcrumbs={[
          { label: "后台", href: "/admin" },
          { label: "库存中心", href: "/admin/inventory" },
          { label: "预警管理" },
        ]}
      />

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <AdminCard className="border-l-4 border-l-amber-500">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">待处理预警</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{metrics.active}</p>
        </AdminCard>
        <AdminCard className="border-l-4 border-l-rose-500">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">核心缺货风险</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{metrics.outOfStock}</p>
        </AdminCard>
        <AdminCard className="border-l-4 border-l-amber-400">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">补货建议</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{metrics.lowStock}</p>
        </AdminCard>
        <AdminCard className="border-l-4 border-l-emerald-500">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">本月已解决</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{metrics.resolved}</p>
        </AdminCard>
      </div>

      <AdminCard>
        <FilterBar
          action={
            <button
              onClick={fetchAlerts}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              刷新列表
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm text-slate-600">
              <span>状态过滤</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition-colors focus:border-blue-500"
              >
                <option value="active">待处理</option>
                <option value="resolved">已解决</option>
                <option value="all">全部记录</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
              <span>搜索关键词</span>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索商品名、SKU、ID..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition-colors focus:border-blue-500"
              />
            </label>
          </div>
        </FilterBar>

        <div className="mt-6">
          <AdminTable
            columns={columns}
            data={filteredAlerts}
            rowKey={(item) => item.id}
            loading={loading}
            emptyTitle="暂无库存预警"
            emptyDescription="当前没有需要立即处理的库存异常。系统运行良好！"
          />
        </div>
      </AdminCard>

      {selectedAlert ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <h3 className="text-lg font-bold text-slate-950">处理预警工单</h3>
              <p className="mt-1 text-sm text-slate-500">标记为已解决前，请确认已完成相应库存调整或补货操作。</p>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">预警商品</span>
                  <span className="font-medium text-slate-950">{selectedAlert.product_name}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-slate-500">预警原因</span>
                  <StatusBadge tone={getAlertTone(selectedAlert.alert_type)}>{getAlertLabel(selectedAlert.alert_type)}</StatusBadge>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-slate-500">当前库存 / 阈值</span>
                  <span className="font-medium text-slate-950">
                    {selectedAlert.current_stock} / {selectedAlert.threshold}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">处理备注</label>
                <textarea
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  rows={4}
                  placeholder="请输入处理结论，如：已完成线下补货 50 件 / 已通过入库单增加库存"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-50 bg-slate-50/50 px-6 py-4">
              <button
                onClick={() => setSelectedAlert(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                取消
              </button>
              <button
                onClick={resolveAlert}
                disabled={!resolveNote.trim()}
                className="rounded-lg bg-slate-950 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 disabled:opacity-50"
              >
                确认并闭环
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
