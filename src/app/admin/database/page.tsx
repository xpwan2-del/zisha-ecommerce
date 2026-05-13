"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import {
  InformationCircleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TableCellsIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface TableInfo {
  name: string;
  count: number;
}

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

const inputClassName = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
const labelClassName = 'mb-2 block text-sm font-medium text-slate-700';

export default function DatabaseManager() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tableData, setTableData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [searchTable, setSearchTable] = useState("");
  const [inventoryStatuses, setInventoryStatuses] = useState<any[]>([]);

  const fetchInventoryStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inventory-status");
      const data = await res.json();
      if (data.success) {
        setInventoryStatuses(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch inventory statuses:", err);
    }
  }, []);

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/database/tables");
      const data = await res.json();
      if (data.success) {
        setTables(data.data);
        if (data.data.length > 0 && !selectedTable) {
          setSelectedTable(data.data[0].name);
        }
      }
    } catch (err) {
      console.error("Failed to fetch tables:", err);
    }
  }, [selectedTable]);

  const fetchTableData = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    setError(null);
    setEditingRow(null);
    setIsCreating(false);
    try {
      const res = await fetch(`/api/admin/database/table/${selectedTable}?page=${page}&limit=${pageSize}`);
      const data = await res.json();
      if (data.success) {
        setTableData(data.data.rows);
        setColumns(data.data.columns);
        setTotal(data.data.total);
      } else {
        setError(data.error || "Failed to fetch data");
      }
    } catch (err) {
      setError("Failed to fetch data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedTable, page, pageSize]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
    }
    if (selectedTable === 'inventory') {
      fetchInventoryStatuses();
    }
  }, [selectedTable, fetchTableData, fetchInventoryStatuses]);

  const handleEdit = (row: any) => {
    setEditingRow(row);
    const rowData: Record<string, string> = {};
    columns.forEach((col) => {
      rowData[col.name] = row[col.name] !== null ? String(row[col.name]) : "";
    });
    setFormData(rowData);
    setIsCreating(false);
  };

  const handleCreate = () => {
    const newForm: Record<string, string> = {};
    columns.forEach((col) => {
      if (col.name !== "id") {
        newForm[col.name] = "";
      }
    });
    setFormData(newForm);
    setEditingRow(null);
    setIsCreating(true);
  };

  const handleSave = async () => {
    try {
      const method = isCreating ? "POST" : "PUT";
      const url = isCreating
        ? `/api/admin/database/table/${selectedTable}`
        : `/api/admin/database/table/${selectedTable}/${editingRow.id}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setEditingRow(null);
        setIsCreating(false);
        fetchTableData();
        alert(`数据库已更新：${selectedTable}`);
      } else {
        alert(`保存失败: ${data.error || "未知错误"}`);
      }
    } catch (err) {
      console.error("[handleSave] 错误:", err);
      alert("保存失败: " + String(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这条记录吗？这将直接修改物理数据库！")) return;
    try {
      const res = await fetch(`/api/admin/database/table/${selectedTable}/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchTableData();
      } else {
        alert(data.error || "Failed to delete");
      }
    } catch (err) {
      alert("Failed to delete");
      console.error(err);
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setIsCreating(false);
  };

  const totalPages = Math.ceil(total / pageSize);

  const filteredTables = useMemo(() =>
    tables.filter((table) =>
      table.name.toLowerCase().includes(searchTable.toLowerCase())
    ),
    [tables, searchTable]
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="SYSTEM DB"
        title="数据库控制中心"
        description="底层数据表的直接运维工具。非必要请勿手动修改生产数据库，删除和保存会直接影响物理数据。"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Database' }]}
        action={
          <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
            <InformationCircleIcon className="h-4 w-4" />
            高风险操作区域
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <AdminCard title={`数据表 (${tables.length})`} className="lg:sticky lg:top-6 lg:self-start">
          <div className="mt-4 space-y-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索表名..."
                value={searchTable}
                onChange={(e) => setSearchTable(e.target.value)}
                className={`${inputClassName} pl-10`}
              />
            </div>
            <div className="max-h-[calc(100vh-320px)] space-y-1 overflow-y-auto pr-1">
              {filteredTables.map((table) => (
                <button
                  key={table.name}
                  onClick={() => {
                    setSelectedTable(table.name);
                    setPage(1);
                    setEditingRow(null);
                    setIsCreating(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    selectedTable === table.name
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <TableCellsIcon className={`h-4 w-4 shrink-0 ${selectedTable === table.name ? 'text-blue-100' : 'text-slate-400'}`} />
                    <span className="truncate font-medium">{table.name}</span>
                  </span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${selectedTable === table.name ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {table.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </AdminCard>

        <AdminCard
          title={selectedTable ? `表：${selectedTable}` : '请选择数据表'}
          description={`共 ${total} 条记录，当前第 ${page} 页`}
          action={
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={!selectedTable} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                <PlusIcon className="h-4 w-4" />
                新增记录
              </button>
              <button onClick={fetchTableData} disabled={!selectedTable} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                刷新
              </button>
            </div>
          }
        >
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="max-h-[600px] overflow-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr>
                      {columns.map((col) => (
                        <th key={col.name} className="whitespace-nowrap bg-slate-50 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {col.name}
                          {col.pk === 1 ? <span className="ml-1 text-red-500">PK</span> : null}
                        </th>
                      ))}
                      <th className="sticky right-0 bg-slate-50 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {tableData.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-sm text-slate-500">暂无数据</td>
                      </tr>
                    ) : tableData.map((row, idx) => (
                      <tr key={idx} className="group transition hover:bg-slate-50/80">
                        {columns.map((col) => (
                          <td key={col.name} className="max-w-xs truncate px-4 py-3 text-xs text-slate-600" title={String(row[col.name] ?? '-')}>{String(row[col.name] ?? '-')}</td>
                        ))}
                        <td className="sticky right-0 whitespace-nowrap bg-white/95 px-4 py-3 text-right text-xs backdrop-blur-sm group-hover:bg-slate-50/95">
                          <button onClick={() => handleEdit(row)} className="mr-3 font-semibold text-blue-600 transition hover:text-blue-800">编辑</button>
                          <button onClick={() => handleDelete(row.id)} className="font-semibold text-red-600 transition hover:text-red-800">删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>每页</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>条</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(1)} disabled={page <= 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">首页</button>
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">上一页</button>
              <span className="px-2 text-xs font-semibold text-slate-500">第 {page} / {totalPages || 1} 页</span>
              <button onClick={() => setPage(Math.min(totalPages || 1, page + 1))} disabled={page >= totalPages} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">下一页</button>
              <button onClick={() => setPage(totalPages || 1)} disabled={page >= totalPages} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">末页</button>
            </div>
          </div>
        </AdminCard>
      </div>

      {(editingRow || isCreating) ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">Database Record</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">{isCreating ? "新增记录" : "编辑记录"}</h2>
                <p className="mt-1 text-sm text-slate-500">表：{selectedTable}</p>
              </div>
              <button onClick={handleCancel} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
              {columns.filter((col) => !isCreating || col.name !== "id").map((col) => {
                const isColorField = /color|bg|border|text|accent|secondary|primary/i.test(col.name);
                const isStatusIdField = col.name === 'status_id' && selectedTable === 'inventory';
                return (
                  <div key={col.name}>
                    <label className={labelClassName}>
                      {col.name}
                      {col.pk === 1 ? <span className="ml-1 text-xs text-red-500">PK</span> : null}
                      <span className="ml-1 text-xs font-normal text-slate-400">({col.type})</span>
                    </label>
                    {isColorField ? (
                      <div className="flex items-center gap-2">
                        <input type="color" value={formData[col.name] || "#000000"} onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })} className="h-11 w-12 cursor-pointer rounded-xl border border-slate-200" />
                        <input type="text" value={formData[col.name] || ""} onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })} className={`${inputClassName} font-mono`} placeholder="#000000" />
                      </div>
                    ) : isStatusIdField ? (
                      <select value={formData[col.name] || "1"} onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })} className={inputClassName}>
                        {inventoryStatuses.map((status: any) => (
                          <option key={status.id} value={status.id}>{status.name} ({status.color_name})</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" value={formData[col.name] || ""} onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })} disabled={col.pk === 1 && !isCreating} className={`${inputClassName} ${col.pk === 1 && !isCreating ? 'bg-slate-50 text-slate-400' : ''}`} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button onClick={handleCancel} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">取消</button>
              <button onClick={handleSave} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">确认保存</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
