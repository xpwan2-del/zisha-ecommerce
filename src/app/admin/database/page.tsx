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

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
    }
    if (selectedTable === 'inventory') {
      fetchInventoryStatuses();
    }
  }, [selectedTable, page, pageSize]);

  const fetchInventoryStatuses = async () => {
    try {
      const res = await fetch("/api/inventory-status");
      const data = await res.json();
      if (data.success) {
        setInventoryStatuses(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch inventory statuses:", err);
    }
  };

  const fetchTables = async () => {
    try {
      const res = await fetch("/api/db/tables");
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
  };

  const fetchTableData = async () => {
    setLoading(true);
    setError(null);
    setEditingRow(null);
    setIsCreating(false);
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
        ? `/api/db/table/${selectedTable}`
        : `/api/db/table/${selectedTable}/${editingRow.id}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        // 保存成功后，从数据库重新读取最新数据
        let dbRecord = null;
        if (!isCreating && editingRow?.id) {
          try {
            const getRes = await fetch(`/api/db/table/${selectedTable}?page=1&limit=100`);
            const getData = await getRes.json();
            if (getData.success) {
              // 找到更新后的那条记录
              dbRecord = getData.data.rows.find((r: any) => r.id == editingRow.id);
            }
          } catch (e) {
            console.error("读取数据库失败", e);
          }
        }

        if (dbRecord) {
          alert(`✅ 数据库已更新！\n\n表: ${selectedTable}\nID: ${editingRow.id}\n\n数据库最新数据:\n${JSON.stringify(dbRecord, null, 2)}`);
        } else {
          alert(`✅ 数据库已更新！\n\n表: ${selectedTable}\nID: ${editingRow?.id || '新建'}\n\n（无法重新查询数据库，请刷新页面查看）`);
        }

        setEditingRow(null);
        setIsCreating(false);
        fetchTableData();
      } else {
        alert(`❌ 保存失败: ${data.error || "未知错误"}`);
      }
    } catch (err) {
      console.error("[handleSave] 错误:", err);
      alert("保存失败: " + String(err));
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

  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(searchTable.toLowerCase())
  );

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
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
              <h2 className="text-lg font-bold mb-4 text-[var(--text)]">数据表 ({tables.length})</h2>
              <input
                type="text"
                placeholder="搜索表名..."
                value={searchTable}
                onChange={(e) => setSearchTable(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md mb-4 text-[var(--text)]"
              />
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto space-y-1">
                {filteredTables.map((table) => (
                  <button
                    key={table.name}
                    onClick={() => {
                      setSelectedTable(table.name);
                      setPage(1);
                      setEditingRow(null);
                      setIsCreating(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center ${
                      selectedTable === table.name
                        ? "bg-[var(--accent)] text-white"
                        : "hover:bg-[var(--background)] text-[var(--text)]"
                    }`}
                  >
                    <span className="truncate">{table.name}</span>
                    <span className="text-xs opacity-70">{table.count}</span>
                  </button>
                ))}
              </div>
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
                          .map((col) => {
                            const isColorField = /color|bg|border|text|accent|secondary|primary/i.test(col.name);
                            const isStatusIdField = col.name === 'status_id' && selectedTable === 'inventory';
                            return (
                              <div key={col.name}>
                                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                                  {col.name}
                                  {col.pk === 1 && <span className="text-red-500 ml-1">*PK</span>}
                                </label>
                                {isColorField ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={formData[col.name] || "#000000"}
                                      onChange={(e) =>
                                        setFormData({ ...formData, [col.name]: e.target.value })
                                      }
                                      className="w-10 h-10 cursor-pointer rounded border"
                                    />
                                    <input
                                      type="text"
                                      value={formData[col.name] || ""}
                                      onChange={(e) =>
                                        setFormData({ ...formData, [col.name]: e.target.value })
                                      }
                                      className="flex-1 px-3 py-2 border border-[var(--border)] rounded-md text-[var(--text)] font-mono text-sm"
                                      placeholder="#000000"
                                    />
                                    <div
                                      className="w-8 h-8 rounded border"
                                      style={{ backgroundColor: formData[col.name] || "#ccc" }}
                                    />
                                  </div>
                                ) : isStatusIdField ? (
                                  <select
                                    value={formData[col.name] || "1"}
                                    onChange={(e) =>
                                      setFormData({ ...formData, [col.name]: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-[var(--text)]"
                                  >
                                    {inventoryStatuses.map((status: any) => (
                                      <option key={status.id} value={status.id}>
                                        {status.name} ({status.color_name})
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={formData[col.name] || ""}
                                    onChange={(e) =>
                                      setFormData({ ...formData, [col.name]: e.target.value })
                                    }
                                    disabled={col.pk === 1 && !isCreating}
                                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-[var(--text)] disabled:bg-gray-100"
                                  />
                                )}
                              </div>
                            );
                          })}
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
                              {col.pk === 1 && <span className="ml-1 text-[var(--color-red)]">PK</span>}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[var(--border)]">
                        {tableData.length === 0 ? (
                          <tr>
                            <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-[var(--text-muted)]">
                              暂无数据
                            </td>
                          </tr>
                        ) : (
                          tableData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-[var(--background)]">
                              {columns.map((col) => (
                                <td
                                  key={col.name}
                                  className="px-4 py-3 text-sm text-[var(--text)] max-w-xs truncate"
                                  title={String(row[col.name] ?? "-")}
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
                          ))
                        )}
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
                        onClick={() => setPage(1)}
                        disabled={page <= 1}
                        className="px-2 py-1 border border-[var(--border)] rounded-md disabled:opacity-50"
                      >
                        首页
                      </button>
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="px-3 py-1 border border-[var(--border)] rounded-md disabled:opacity-50"
                      >
                        上一页
                      </button>
                      <span className="text-sm text-[var(--text)]">
                        第 {page} / {totalPages || 1} 页
                      </span>
                      <button
                        onClick={() => setPage(Math.min(totalPages || 1, page + 1))}
                        disabled={page >= totalPages}
                        className="px-3 py-1 border border-[var(--border)] rounded-md disabled:opacity-50"
                      >
                        下一页
                      </button>
                      <button
                        onClick={() => setPage(totalPages || 1)}
                        disabled={page >= totalPages}
                        className="px-2 py-1 border border-[var(--border)] rounded-md disabled:opacity-50"
                      >
                        末页
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
