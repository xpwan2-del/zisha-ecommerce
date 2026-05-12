"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/ui/admin-table";
import { StatusBadge } from "@/components/admin/ui/status-badge";

interface InventoryItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  status_id: number;
  status_name?: string;
  status_color?: string;
  updated_at: string;
}

interface Transaction {
  id: number;
  product_id: number;
  product_name: string;
  transaction_type?: string;
  transaction_code?: string;
  transaction_name_zh?: string;
  transaction_name_en?: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string;
  operator_name: string;
  created_at: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<InventoryItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    change_type: "increase",
    quantity: "",
    reason: ""
  });

  useEffect(() => {
    fetchInventory();
    fetchTransactions();
  }, []);

  const sortedInventory = useMemo(() => {
    return [...inventory].sort((a, b) => {
      const aPriority = a.quantity <= 0 ? 0 : a.quantity <= 10 ? 1 : 2;
      const bPriority = b.quantity <= 0 ? 0 : b.quantity <= 10 ? 1 : 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.quantity - b.quantity;
    });
  }, [inventory]);

  const riskItems = useMemo(() => sortedInventory.filter((item) => item.quantity <= 10).slice(0, 8), [sortedInventory]);
  const recentTransactions = useMemo(() => transactions.slice(0, 8), [transactions]);

  const metrics = useMemo(() => {
    const totalSku = inventory.length;
    const totalQuantity = inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const lowStock = inventory.filter((item) => Number(item.quantity || 0) <= 10 && Number(item.quantity || 0) > 0).length;
    const outOfStock = inventory.filter((item) => Number(item.quantity || 0) <= 0).length;
    const healthy = inventory.filter((item) => Number(item.quantity || 0) > 10).length;
    return { totalSku, totalQuantity, lowStock, outOfStock, healthy };
  }, [inventory]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/inventory");
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "获取库存失败");
        return;
      }
      const invData = (data.data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_full_name || item.product_name_en || item.product_name || `Product #${item.product_id}`,
        quantity: Number(item.quantity || 0),
        status_id: item.status_id || 1,
        status_name: item.status_name,
        status_color: item.status_color,
        updated_at: item.updated_at
      }));
      setInventory(invData);
    } catch (err) {
      setError("网络错误，无法获取库存");
      console.error("Failed to fetch inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setTransactionLoading(true);
      const params = new URLSearchParams();
      params.set("limit", "20");
      const res = await fetch(`/api/inventory/transactions?${params.toString()}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "获取库存流水失败");
        return;
      }
      setTransactions(data.data.transactions || []);
    } catch (err) {
      setError("网络错误，无法获取库存流水");
      console.error("Failed to fetch transactions:", err);
    } finally {
      setTransactionLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchInventory(), fetchTransactions()]);
  };

  const openAdjustPanel = (item: InventoryItem) => {
    setAdjustingProduct(item);
    setAdjustForm({ change_type: "increase", quantity: "", reason: "" });
  };

  const handleAdjustStock = async () => {
    if (!adjustingProduct || !adjustForm.quantity) return;
    if (!confirm("确认执行本次库存调整？该操作会写入库存流水和管理员审计日志。")) return;

    try {
      setError(null);
      setMessage(null);
      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: adjustingProduct.product_id,
          change_type: adjustForm.change_type,
          quantity: parseInt(adjustForm.quantity),
          reason: adjustForm.reason || "管理员手动调整"
        })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "库存调整失败");
        return;
      }

      setMessage("库存调整成功，已写入库存流水和审计日志");
      setAdjustingProduct(null);
      setAdjustForm({ change_type: "increase", quantity: "", reason: "" });
      await refreshAll();
    } catch (err) {
      setError("网络错误，库存调整失败");
      console.error("Failed to adjust stock:", err);
    }
  };

  const getStockTone = (quantity: number): "success" | "warning" | "danger" => {
    if (quantity <= 0) return "danger";
    if (quantity <= 10) return "warning";
    return "success";
  };

  const getStockLabel = (quantity: number, statusName?: string) => {
    if (statusName) return statusName;
    if (quantity <= 0) return "缺货";
    if (quantity <= 10) return "低库存";
    return "库存正常";
  };

  const getTransactionDisplayName = (tx: Transaction) => {
    return tx.transaction_name_zh || tx.transaction_name_en || tx.transaction_code || tx.transaction_type || "-";
  };

  const inventoryColumns = [
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
      title: "当前库存",
      render: (item: InventoryItem) => <span className="font-semibold text-slate-950">{item.quantity}</span>
    },
    {
      key: "status",
      title: "库存状态",
      render: (item: InventoryItem) => <StatusBadge tone={getStockTone(item.quantity)}>{getStockLabel(item.quantity, item.status_name)}</StatusBadge>
    },
    {
      key: "updated_at",
      title: "更新时间",
      render: (item: InventoryItem) => <span className="text-slate-500">{item.updated_at ? new Date(item.updated_at).toLocaleString() : "-"}</span>
    },
    {
      key: "actions",
      title: "操作",
      align: "right" as const,
      render: (item: InventoryItem) => (
        <div className="flex justify-end gap-3">
          <a href={`/admin/inventory/transactions?product_id=${item.product_id}`} className="font-medium text-slate-700 hover:text-slate-950">看流水</a>
          <button onClick={() => openAdjustPanel(item)} className="cursor-pointer font-medium text-blue-700 hover:text-blue-900">调库</button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="库存中心"
        title="库存运营中心"
        description="以缺货风险优先展示库存水位、待处理异常和最近流水，帮助运营快速完成预警、盘点、调库与追溯闭环。"
        action={<button onClick={refreshAll} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">刷新数据</button>}
        breadcrumbs={[{ label: "后台", href: "/admin/dashboard" }, { label: "库存中心" }]}
      />

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <AdminCard>
          <p className="text-sm text-slate-500">SKU 总数</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.totalSku}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">总库存</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.totalQuantity}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">库存正常</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{metrics.healthy}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">低库存</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{metrics.lowStock}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">缺货</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">{metrics.outOfStock}</p>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <AdminCard
          title="缺货优先处理队列"
          description="按缺货、低库存、库存数量排序，优先处理最影响履约的 SKU。"
          action={<a href="/admin/inventory/alerts" className="text-sm font-medium text-blue-700 hover:text-blue-900">查看预警</a>}
        >
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">库存加载中...</div>
            ) : riskItems.length === 0 ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-8 text-center text-sm text-emerald-700">当前没有缺货或低库存商品。</div>
            ) : (
              riskItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-950">{item.product_name}</div>
                    <div className="mt-1 text-xs text-slate-500">商品 ID：{item.product_id} · 当前库存 {item.quantity}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge tone={getStockTone(item.quantity)}>{getStockLabel(item.quantity, item.status_name)}</StatusBadge>
                    <button onClick={() => openAdjustPanel(item)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-blue-700 ring-1 ring-slate-200 hover:bg-blue-50">调库</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminCard>

        <AdminCard
          title="操作闭环入口"
          description="将盘点、预警和流水拆成专业子页，但在中心页保留快速入口。"
        >
          <div className="space-y-3">
            <a href="/admin/inventory/transactions" className="block rounded-xl border border-slate-200 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/50">
              <div className="text-sm font-semibold text-slate-950">库存流水</div>
              <div className="mt-1 text-sm text-slate-500">追溯库存变更来源、前后数量和操作人。</div>
            </a>
            <a href="/admin/inventory/checks" className="block rounded-xl border border-slate-200 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/50">
              <div className="text-sm font-semibold text-slate-950">盘点管理</div>
              <div className="mt-1 text-sm text-slate-500">创建盘点单，录入实盘数量，并由后端完成库存修正。</div>
            </a>
            <a href="/admin/inventory/alerts" className="block rounded-xl border border-slate-200 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/50">
              <div className="text-sm font-semibold text-slate-950">预警管理</div>
              <div className="mt-1 text-sm text-slate-500">处理缺货、低库存和积压风险，形成处理记录。</div>
            </a>
          </div>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <AdminCard title="库存总览" description="完整库存列表，默认按缺货风险排序。">
          <AdminTable
            columns={inventoryColumns}
            data={sortedInventory}
            rowKey={(item) => item.id}
            loading={loading}
            emptyTitle="暂无库存数据"
            emptyDescription="当前系统没有返回任何库存记录。"
          />
        </AdminCard>

        <AdminCard
          title="最近库存流水"
          description="展示最近的库存变动，完整追溯请进入库存流水页。"
          action={<a href="/admin/inventory/transactions" className="text-sm font-medium text-blue-700 hover:text-blue-900">全部流水</a>}
        >
          <div className="space-y-3">
            {transactionLoading ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">流水加载中...</div>
            ) : recentTransactions.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">暂无库存流水</div>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="rounded-xl border border-slate-100 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-950">{tx.product_name}</div>
                      <div className="mt-1 text-xs text-slate-500">{getTransactionDisplayName(tx)} · {tx.created_at ? new Date(tx.created_at).toLocaleString() : "-"}</div>
                    </div>
                    <div className={tx.quantity_change > 0 ? "text-sm font-semibold text-emerald-600" : tx.quantity_change < 0 ? "text-sm font-semibold text-rose-600" : "text-sm font-semibold text-slate-600"}>
                      {tx.quantity_change > 0 ? "+" : ""}{tx.quantity_change}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{tx.quantity_before} → {tx.quantity_after} · {tx.operator_name || "-"}</div>
                </div>
              ))
            )}
          </div>
        </AdminCard>
      </div>

      {adjustingProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="text-lg font-semibold text-slate-950">库存调整</h3>
              <p className="mt-1 text-sm text-slate-500">{adjustingProduct.product_name} · 当前库存 {adjustingProduct.quantity}</p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <label className="block text-sm font-medium text-slate-700">
                调整方式
                <select value={adjustForm.change_type} onChange={(event) => setAdjustForm({ ...adjustForm, change_type: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="increase">增加库存</option>
                  <option value="decrease">减少库存</option>
                  <option value="set">设置为固定库存</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                数量
                <input type="number" value={adjustForm.quantity} onChange={(event) => setAdjustForm({ ...adjustForm, quantity: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" min="0" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                原因
                <input type="text" value={adjustForm.reason} onChange={(event) => setAdjustForm({ ...adjustForm, reason: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="例如：后台盘点修正 / 供应商补货 / 损耗修正" />
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button onClick={() => setAdjustingProduct(null)} className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">取消</button>
              <button onClick={handleAdjustStock} className="cursor-pointer rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">确认调整</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
