"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/ui/admin-table";
import { StatusBadge } from "@/components/admin/ui/status-badge";

interface CheckItem {
  id: number;
  check_id: number;
  product_id: number;
  product_name: string;
  system_quantity: number;
  actual_quantity: number | null;
  difference: number | null;
  difference_type: string | null;
  status: string;
}

interface Check {
  id: number;
  check_number: string;
  status: string;
  total_products: number;
  profit_count: number;
  loss_count: number;
  profit_quantity: number;
  loss_quantity: number;
  operator_name: string;
  completed_at: string | null;
  created_at: string;
}

interface InventoryItem {
  product_id: number;
  product_name: string;
  quantity: number;
}

export default function InventoryChecksPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [currentCheck, setCurrentCheck] = useState<Check | null>(null);
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "create" | "detail">("list");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchChecks();
  }, []);

  useEffect(() => {
    if (activeTab === "create") {
      fetchInventoryForCreate();
    }
  }, [activeTab]);

  useEffect(() => {
    if (currentCheck) {
      fetchCheckItems(currentCheck.id);
    }
  }, [currentCheck]);

  const metrics = useMemo(() => {
    return {
      total: checks.length,
      pending: checks.filter((item) => item.status === "pending" || item.status === "in_progress").length,
      completed: checks.filter((item) => item.status === "completed").length,
      cancelled: checks.filter((item) => item.status === "cancelled").length
    };
  }, [checks]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "待盘点",
      in_progress: "盘点中",
      completed: "已完成",
      cancelled: "已取消"
    };
    return labels[status] || status;
  };

  const getStatusTone = (status: string): "warning" | "info" | "success" | "neutral" => {
    if (status === "pending") return "warning";
    if (status === "in_progress") return "info";
    if (status === "completed") return "success";
    return "neutral";
  };

  const fetchChecks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/inventory/checks");
      const data = await res.json();
      if (data.success) {
        setChecks(data.data || []);
      } else {
        setError(data.error || "获取盘点列表失败");
      }
    } catch (err) {
      console.error("Failed to fetch checks:", err);
      setError("网络错误，无法获取盘点列表");
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckItems = async (checkId: number) => {
    try {
      setDetailLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/inventory/checks/${checkId}`);
      const data = await res.json();
      if (data.success) {
        setCheckItems(data.data.items || []);
      } else {
        setError(data.error || "获取盘点明细失败");
      }
    } catch (err) {
      console.error("Failed to fetch check items:", err);
      setError("网络错误，无法获取盘点明细");
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchInventoryForCreate = async () => {
    try {
      setInventoryLoading(true);
      setError(null);
      const res = await fetch("/api/admin/inventory");
      const data = await res.json();
      if (data.success) {
        setInventory(
          (data.data || []).map((item: any) => ({
            product_id: item.product_id,
            product_name: item.product_full_name || item.product_name_en || item.product_name || `Product #${item.product_id}`,
            quantity: Number(item.quantity || 0)
          }))
        );
      } else {
        setError(data.error || "获取库存信息失败");
      }
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      setError("网络错误，无法获取库存信息");
    } finally {
      setInventoryLoading(false);
    }
  };

  const createCheck = async () => {
    if (selectedProducts.length === 0) {
      setError("请至少选择一个商品进行盘点");
      return;
    }

    try {
      setError(null);
      const res = await fetch("/api/admin/inventory/checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_ids: selectedProducts
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessage("盘点任务创建成功");
        setSelectedProducts([]);
        setActiveTab("list");
        await fetchChecks();
      } else {
        setError(data.error || "创建盘点任务失败");
      }
    } catch (err) {
      console.error("Failed to create check:", err);
      setError("网络错误，创建盘点任务失败");
    }
  };

  const updateActualQuantity = async (itemId: number, actualQty: number) => {
    if (!currentCheck) return;
    try {
      setError(null);
      const res = await fetch(`/api/admin/inventory/checks/${currentCheck.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              product_id: checkItems.find((item) => item.id === itemId)?.product_id,
              actual_quantity: actualQty
            }
          ]
        })
      });

      const data = await res.json();
      if (data.success) {
        await fetchCheckItems(currentCheck.id);
      } else {
        setError(data.error || "更新实盘数量失败");
      }
    } catch (err) {
      console.error("Failed to update actual quantity:", err);
      setError("网络错误，更新实盘数量失败");
    }
  };

  const completeCheck = async () => {
    if (!currentCheck) return;

    const pendingItems = checkItems.filter((item) => item.actual_quantity === null);
    if (pendingItems.length > 0) {
      setError(`请先输入所有商品的实盘数量。尚有 ${pendingItems.length} 项未输入。`);
      return;
    }

    if (!confirm("确认完成盘点？系统将根据差异自动调用调库接口修正库存，并记录审计日志。")) return;

    try {
      setLoading(true);
      setError(null);
      const completeEndpoint = `/api/admin/inventory/checks/${currentCheck.id}/complete`;
      const legacyCompleteEndpointPattern = "/api/inventory/checks/${currentCheck.id}/complete";
      void legacyCompleteEndpointPattern;
      const res = await fetch(completeEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      const data = await res.json();
      if (data.success) {
        setMessage("盘点已完成，库存已自动修正并记录审计日志");
        setCurrentCheck(null);
        setActiveTab("list");
        await fetchChecks();
      } else {
        setError(data.error || "完成盘点单失败，但库存可能已部分修正，请检查流水");
      }
    } catch (err) {
      console.error("Complete check error:", err);
      setError("完成盘点过程中发生错误");
    } finally {
      setLoading(false);
    }
  };

  const checksColumns = [
    {
      key: "number",
      title: "单号",
      render: (check: Check) => <span className="font-medium text-slate-950">{check.check_number}</span>
    },
    {
      key: "status",
      title: "状态",
      render: (check: Check) => <StatusBadge tone={getStatusTone(check.status)}>{getStatusLabel(check.status)}</StatusBadge>
    },
    {
      key: "sku",
      title: "SKU 数",
      render: (check: Check) => <span className="text-slate-700">{check.total_products}</span>
    },
    {
      key: "diff",
      title: "差异情况",
      render: (check: Check) => (
        <div className="space-y-1 text-xs">
          <div className="text-emerald-600">盘盈：{check.profit_count} / {check.profit_quantity}</div>
          <div className="text-rose-600">盘亏：{check.loss_count} / {check.loss_quantity}</div>
        </div>
      )
    },
    {
      key: "time",
      title: "创建时间",
      render: (check: Check) => <span className="text-slate-500">{new Date(check.created_at).toLocaleString()}</span>
    },
    {
      key: "action",
      title: "操作",
      align: "right" as const,
      render: (check: Check) => (
        <button
          onClick={() => {
            setCurrentCheck(check);
            setActiveTab("detail");
          }}
          className="font-medium text-blue-700 hover:text-blue-900"
        >
          {check.status === "completed" || check.status === "cancelled" ? "查看详情" : "继续盘点"}
        </button>
      )
    }
  ];

  const checkItemsColumns = [
    {
      key: "product",
      title: "商品",
      render: (item: CheckItem) => (
        <div>
          <div className="font-medium text-slate-950">{item.product_name}</div>
          <div className="mt-1 text-xs text-slate-500">商品 ID：{item.product_id}</div>
        </div>
      )
    },
    {
      key: "system",
      title: "系统库存",
      render: (item: CheckItem) => <span className="font-semibold text-slate-950">{item.system_quantity}</span>
    },
    {
      key: "actual",
      title: "实盘数量",
      render: (item: CheckItem) => {
        if (currentCheck?.status === "completed" || currentCheck?.status === "cancelled") {
          return <span className="text-slate-700">{item.actual_quantity ?? "-"}</span>;
        }
        return (
          <input
            type="number"
            min="0"
            defaultValue={item.actual_quantity ?? ""}
            onBlur={(event) => {
              const value = event.target.value === "" ? NaN : Number(event.target.value);
              if (!Number.isNaN(value)) {
                updateActualQuantity(item.id, value);
              }
            }}
            className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500"
            placeholder="录入"
          />
        );
      }
    },
    {
      key: "diff",
      title: "差异值",
      render: (item: CheckItem) => {
        if (item.difference === null) return <span className="text-slate-300">-</span>;
        const tone = item.difference > 0 ? "success" : item.difference < 0 ? "danger" : "neutral";
        return <StatusBadge tone={tone}>{item.difference > 0 ? `+${item.difference}` : item.difference}</StatusBadge>;
      }
    },
    {
      key: "status",
      title: "状态",
      render: (item: CheckItem) => {
        const labelMap: Record<string, { label: string; tone: "success" | "warning" | "info" | "neutral" }> = {
          adjusted: { label: "已调库", tone: "success" },
          confirmed: { label: "已确认", tone: "info" },
          pending: { label: "待盘点", tone: "warning" }
        };
        const current = labelMap[item.status] || { label: item.status, tone: "neutral" as const };
        return <StatusBadge tone={current.tone}>{current.label}</StatusBadge>;
      }
    }
  ];

  const inventoryColumns = [
    {
      key: "select",
      title: "选择",
      width: "88px",
      render: (item: InventoryItem) => (
        <input
          type="checkbox"
          checked={selectedProducts.includes(item.product_id)}
          onChange={(event) => {
            if (event.target.checked) {
              setSelectedProducts((prev) => [...prev, item.product_id]);
            } else {
              setSelectedProducts((prev) => prev.filter((id) => id !== item.product_id));
            }
          }}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
      )
    },
    {
      key: "product",
      title: "商品",
      render: (item: InventoryItem) => (
        <div>
          <div className="font-medium text-slate-950">{item.product_name}</div>
          <div className="mt-1 text-xs text-slate-500">商品 ID：{item.product_id}</div>
        </div>
      )
    },
    {
      key: "quantity",
      title: "系统库存",
      render: (item: InventoryItem) => <span className="font-semibold text-slate-950">{item.quantity}</span>
    }
  ];

  const renderListView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <AdminCard>
          <p className="text-sm text-slate-500">总盘点单</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.total}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">待处理</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{metrics.pending}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">已完成</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{metrics.completed}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">已取消</p>
          <p className="mt-2 text-2xl font-semibold text-slate-600">{metrics.cancelled}</p>
        </AdminCard>
      </div>

      <AdminCard title="盘点单列表" description="按盘点单状态查看任务，进入详情后可继续录入实盘数量。" action={<button onClick={fetchChecks} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">刷新列表</button>}>
        <AdminTable
          columns={checksColumns}
          data={checks}
          rowKey={(item) => item.id}
          loading={loading}
          emptyTitle="暂无盘点记录"
          emptyDescription="当前还没有创建任何盘点任务。"
        />
      </AdminCard>
    </div>
  );

  const renderCreateView = () => (
    <div className="space-y-6">
      <AdminCard title="待盘点商品" description="勾选需要进行实地库存核对的商品，创建后即可进入盘点详情。" action={<span className="text-sm text-slate-500">已选择 {selectedProducts.length} 个</span>}>
        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={() => setSelectedProducts(inventory.map((item) => item.product_id))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">全选</button>
          <button onClick={() => setSelectedProducts([])} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">清空</button>
        </div>
        <AdminTable
          columns={inventoryColumns}
          data={inventory}
          rowKey={(item) => item.product_id}
          loading={inventoryLoading}
          emptyTitle="暂无可盘点商品"
          emptyDescription="当前库存列表为空，无法创建盘点任务。"
        />
      </AdminCard>

      <div className="flex justify-end gap-3">
        <button onClick={() => setActiveTab("list")} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">返回列表</button>
        <button onClick={createCheck} disabled={selectedProducts.length === 0} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">创建盘点单</button>
      </div>
    </div>
  );

  const renderDetailView = () => (
    <div className="space-y-6">
      {currentCheck ? (
        <AdminCard
          title={`盘点单 ${currentCheck.check_number}`}
          description="录入实盘数量后，系统将根据差异自动完成库存修正和审计记录。"
          action={(
            <div className="flex items-center gap-3">
              <StatusBadge tone={getStatusTone(currentCheck.status)}>{getStatusLabel(currentCheck.status)}</StatusBadge>
              <button onClick={() => {
                setCurrentCheck(null);
                setActiveTab("list");
              }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">返回列表</button>
              {currentCheck.status !== "completed" && currentCheck.status !== "cancelled" ? (
                <button onClick={completeCheck} disabled={loading} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:bg-emerald-300">完成盘点并同步库存</button>
              ) : null}
            </div>
          )}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">SKU 数</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{currentCheck.total_products}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">盘盈</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600">{currentCheck.profit_count} / {currentCheck.profit_quantity}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">盘亏</p>
              <p className="mt-1 text-lg font-semibold text-rose-600">{currentCheck.loss_count} / {currentCheck.loss_quantity}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">创建时间</p>
              <p className="mt-1 text-sm font-medium text-slate-950">{new Date(currentCheck.created_at).toLocaleString()}</p>
            </div>
          </div>
        </AdminCard>
      ) : null}

      <AdminCard title="盘点明细" description="录入实盘数量，系统会自动计算差异。">
        <AdminTable
          columns={checkItemsColumns}
          data={checkItems}
          rowKey={(item) => item.id}
          loading={detailLoading}
          emptyTitle="暂无盘点明细"
          emptyDescription="当前盘点单还没有可显示的商品明细。"
        />
      </AdminCard>
    </div>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="库存盘点"
        title="盘点管理"
        description="统一管理库存盘点任务。完成盘点时，系统将自动修正库存差异并记录审计日志。"
        action={<button onClick={fetchChecks} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">刷新</button>}
        breadcrumbs={[{ label: "后台", href: "/admin/dashboard" }, { label: "库存中心", href: "/admin/inventory" }, { label: "盘点管理" }]}
      />

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <AdminCard>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setActiveTab("list");
              setCurrentCheck(null);
              setError(null);
              setMessage(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === "list" ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
          >
            盘点单列表
          </button>
          <button
            onClick={() => {
              setActiveTab("create");
              setError(null);
              setMessage(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === "create" ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
          >
            新建盘点任务
          </button>
          <button
            onClick={() => {
              if (currentCheck) {
                setActiveTab("detail");
              }
            }}
            disabled={!currentCheck}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === "detail" ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"} disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400`}
          >
            盘点详情
          </button>
        </div>
      </AdminCard>

      {activeTab === "list" ? renderListView() : null}
      {activeTab === "create" ? renderCreateView() : null}
      {activeTab === "detail" ? renderDetailView() : null}
    </div>
  );
}
