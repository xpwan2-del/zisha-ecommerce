"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

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

export default function DatabaseManager() {
  const { t } = useTranslation();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("users");
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

  const tableGroups = [
    { name: "用户管理", tables: ["users", "addresses", "user_coupons", "user_favorites", "user_browse_history", "user_logs"] },
    { name: "商品管理", tables: ["products", "categories", "product_features", "product_promotions", "product_activities", "materials", "teapot_types", "feature_templates"] },
    { name: "订单管理", tables: ["orders", "order_items", "order_payments", "order_status_logs", "order_logistics", "order_coupons", "cart_items"] },
    { name: "促销管理", tables: ["promotions", "coupons", "product_activity_logs", "promotion_stats"] },
    { name: "评价管理", tables: ["reviews", "review_replies", "review_helpful"] },
    { name: "系统配置", tables: ["system_configs", "translations", "activity_categories"] },
    { name: "其他", tables: ["about", "contact", "lucky_draws", "lucky_draw_orders", "recommendations"] },
  ];

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
    }
  }, [selectedTable, page, pageSize]);

  const fetchTables = async () => {
    try {
      const res = await fetch("/api/db/tables");
      const data = await res.json();
      if (data.success) {
        setTables(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch tables:", err);
    }
  };

  const fetchTableData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/db/table/${selectedTable}?page=${page}&limit=${pageSize}`);
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
  };

  const handleEdit = (row: any) => {
    setEditingRow(row);
    setFormData(row);
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
        ? `/api/db/table/${selectedTable}`
        : `/api/db/table/${selectedTable}/${editingRow.id}`;

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
      } else {
        alert(data.error || "Failed to save");
      }
    } catch (err) {
      alert("Failed to save");
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这条记录吗？")) return;
    try {
      const res = await fetch(`/api/db/table/${selectedTable}/${id}`, {
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">数据库管理</h1>
          <p className="text-white/80 mt-2">查看和编辑所有数据库表</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* 左侧导航 */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
              <h2 className="text-lg font-bold mb-4 text-[var(--text)]">数据表</h2>
              {tableGroups.map((group) => (
                <div key={group.name} className="mb-4">
                  <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-2">
                    {group.name}
                  </h3>
                  <div className="space-y-1">
                    {group.tables.map((table) => (
                      <button
                        key={table}
                        onClick={() => {
                          setSelectedTable(table);
                          setPage(1);
                          setEditingRow(null);
                          setIsCreating(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedTable === table
                            ? "bg-[var(--accent)] text-white"
                            : "hover:bg-[var(--background)] text-[var(--text)]"
                        }`}
                      >
                        {table}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧内容 */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--text)]">
                  表: {selectedTable}
                  <span className="text-sm font-normal text-[var(--text-muted)] ml-2">
                    (共 {total} 条记录)
                  </span>
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-[var(--color-green)] text-white rounded-md hover:opacity-90"
                  >
                    新增
                  </button>
                  <button
                    onClick={fetchTableData}
                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:opacity-90"
                  >
                    刷新
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-8">加载中...</div>
              ) : (
                <>
                  {/* 编辑/新增表单 */}
                  {(editingRow || isCreating) && (
                    <div className="bg-[var(--background)] p-4 rounded-lg mb-4">
                      <h3 className="font-bold mb-4 text-[var(--text)]">
                        {isCreating ? "新增记录" : "编辑记录"}
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        {columns
                          .filter((col) => !isCreating || col.name !== "id")
                          .map((col) => (
                            <div key={col.name}>
                              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                                {col.name}
                                {col.pk === 1 && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              <input
                                type="text"
                                value={formData[col.name] || ""}
                                onChange={(e) =>
                                  setFormData({ ...formData, [col.name]: e.target.value })
                                }
                                disabled={col.pk === 1 && !isCreating}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-[var(--text)] disabled:bg-gray-100"
                              />
                            </div>
                          ))}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-[var(--color-green)] text-white rounded-md hover:opacity-90"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:opacity-90"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 数据表格 */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border)]">
                      <thead className="bg-[var(--background)]">
                        <tr>
                          {columns.map((col) => (
                            <th
                              key={col.name}
                              className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider"
                            >
                              {col.name}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[var(--border)]">
                        {tableData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[var(--background)]">
                            {columns.map((col) => (
                              <td
                                key={col.name}
                                className="px-4 py-3 text-sm text-[var(--text)] max-w-xs truncate"
                                title={String(row[col.name] ?? "")}
                              >
                                {String(row[col.name] ?? "-")}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right text-sm">
                              <button
                                onClick={() => handleEdit(row)}
                                className="text-[var(--color-blue)] hover:underline mr-2"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDelete(row.id)}
                                className="text-[var(--color-red)] hover:underline"
                              >
                                删除
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 分页 */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--text-muted)]">每页</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(1);
                        }}
                        className="px-2 py-1 border border-[var(--border)] rounded-md"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-sm text-[var(--text-muted)]">条</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="px-3 py-1 border border-[var(--border)] rounded-md disabled:opacity-50"
                      >
                        上一页
                      </button>
                      <span className="text-sm text-[var(--text)]">
                        第 {page} / {totalPages} 页
                      </span>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                        className="px-3 py-1 border border-[var(--border)] rounded-md disabled:opacity-50"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
