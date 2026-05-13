"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/ui/admin-table";
import { FilterBar } from "@/components/admin/ui/filter-bar";
import { StatusBadge } from "@/components/admin/ui/status-badge";

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

export default function InventoryTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (targetProductId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("limit", "100");
      const id = targetProductId ?? productId;
      if (id) params.set("product_id", id);
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
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialProductId = params.get("product_id") || "";
    setProductId(initialProductId);
    fetchTransactions(initialProductId);
  }, [fetchTransactions]);

  const filteredTransactions = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return transactions;
    return transactions.filter((tx) => {
      const source = `${tx.product_name || ""} ${tx.product_id} ${tx.operator_name || ""} ${tx.reason || ""} ${tx.transaction_name_zh || ""} ${tx.transaction_name_en || ""} ${tx.transaction_code || ""}`.toLowerCase();
      return source.includes(text);
    });
  }, [keyword, transactions]);

  const metrics = useMemo(() => {
    const increase = filteredTransactions.filter((tx) => tx.quantity_change > 0).length;
    const decrease = filteredTransactions.filter((tx) => tx.quantity_change < 0).length;
    const netChange = filteredTransactions.reduce((sum, tx) => sum + Number(tx.quantity_change || 0), 0);
    const productCount = new Set(filteredTransactions.map((tx) => tx.product_id)).size;
    return { increase, decrease, netChange, productCount };
  }, [filteredTransactions]);

  const resetFilters = () => {
    setKeyword("");
    setProductId("");
    fetchTransactions("");
  };

  const getTransactionDisplayName = (tx: Transaction) => {
    return tx.transaction_name_zh || tx.transaction_name_en || tx.transaction_code || tx.transaction_type || "-";
  };

  const columns = [
    {
      key: "product",
      title: "商品",
      render: (tx: Transaction) => (
        <div>
          <div className="font-medium text-slate-950">{tx.product_name}</div>
          <div className="mt-1 text-xs text-slate-500">商品 ID：{tx.product_id}</div>
        </div>
      )
    },
    {
      key: "type",
      title: "变动类型",
      render: (tx: Transaction) => (
        <StatusBadge tone={tx.quantity_change > 0 ? "success" : tx.quantity_change < 0 ? "danger" : "neutral"}>
          {getTransactionDisplayName(tx)}
        </StatusBadge>
      )
    },
    {
      key: "before",
      title: "变更前",
      render: (tx: Transaction) => <span className="text-slate-700">{tx.quantity_before}</span>
    },
    {
      key: "change",
      title: "变动量",
      align: "right" as const,
      render: (tx: Transaction) => (
        <span className={tx.quantity_change > 0 ? "font-semibold text-emerald-600" : tx.quantity_change < 0 ? "font-semibold text-rose-600" : "font-semibold text-slate-600"}>
          {tx.quantity_change > 0 ? "+" : ""}{tx.quantity_change}
        </span>
      )
    },
    {
      key: "after",
      title: "变更后",
      render: (tx: Transaction) => <span className="font-medium text-slate-950">{tx.quantity_after}</span>
    },
    {
      key: "reason",
      title: "原因",
      render: (tx: Transaction) => <span className="text-slate-500">{tx.reason || "-"}</span>
    },
    {
      key: "operator",
      title: "操作人",
      render: (tx: Transaction) => tx.operator_name || "-"
    },
    {
      key: "time",
      title: "时间",
      render: (tx: Transaction) => <span className="text-slate-500">{tx.created_at ? new Date(tx.created_at).toLocaleString() : "-"}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="库存流水"
        title="库存追溯中心"
        description="用于查询每一次库存变动的来源、操作者和前后差异，帮助盘点、预警和订单形成完整闭环。"
        action={<button onClick={() => fetchTransactions()} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">刷新流水</button>}
        breadcrumbs={[{ label: "后台", href: "/admin/dashboard" }, { label: "库存中心", href: "/admin/inventory" }, { label: "库存流水" }]}
      />

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <AdminCard>
          <p className="text-sm text-slate-500">命中流水</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{filteredTransactions.length}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">涉及商品</p>
          <p className="mt-2 text-2xl font-semibold text-blue-600">{metrics.productCount}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">入库动作</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{metrics.increase}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-sm text-slate-500">出库动作</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">{metrics.decrease}</p>
        </AdminCard>
      </div>

      <AdminCard title="筛选条件" description="按商品、关键词或商品 ID 快速过滤流水记录。">
        <FilterBar action={<button onClick={() => fetchTransactions()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">查询</button>}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm text-slate-600">
              <span>商品 ID</span>
              <input value={productId} onChange={(event) => setProductId(event.target.value)} placeholder="可选" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition-colors focus:border-blue-500" />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span>关键词</span>
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="商品名 / 操作人 / 原因" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition-colors focus:border-blue-500" />
            </label>
            <div className="flex items-end gap-2">
              <button onClick={resetFilters} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">重置</button>
              <span className="text-sm text-slate-500">净变动：{metrics.netChange > 0 ? "+" : ""}{metrics.netChange}</span>
            </div>
          </div>
        </FilterBar>
      </AdminCard>

      <AdminCard title="流水明细" description="展示库存变更前后数量、操作原因和操作人。">
        <AdminTable
          columns={columns}
          data={filteredTransactions}
          rowKey={(item) => item.id}
          loading={loading}
          emptyTitle="暂无库存流水"
          emptyDescription="当前筛选条件下没有找到任何库存变更记录。"
        />
      </AdminCard>
    </div>
  );
}
