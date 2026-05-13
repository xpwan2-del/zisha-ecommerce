"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/ui/admin-table";
import { EmptyState } from "@/components/admin/ui/empty-state";

interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  priority: number;
}

interface CategoryFormData {
  name: string;
  description: string;
  image: string;
  priority: number;
}

const defaultFormData: CategoryFormData = {
  name: "",
  description: "",
  image: "",
  priority: 0,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/categories");
      const result = await response.json();
      if (response.ok && result.success) {
        setCategories(result.data.map((category: any) => ({
          id: String(category.id),
          name: category.name || "",
          description: category.description || "",
          image: category.image || "",
          priority: Number(category.priority || 0),
        })));
      } else {
        setCategories([]);
        setError(result.error || "分类数据加载失败，请稍后重试");
      }
    } catch (err) {
      setCategories([]);
      setError("分类数据加载失败，请检查网络或接口状态");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.priority - b.priority),
    [categories]
  );

  const metrics = useMemo(() => {
    const withImage = categories.filter((category) => Boolean(category.image)).length;
    const withoutDescription = categories.filter((category) => !category.description).length;
    const highestPriority = sortedCategories[0]?.priority ?? 0;

    return {
      total: categories.length,
      withImage,
      withoutDescription,
      highestPriority,
    };
  }, [categories, sortedCategories]);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingCategory(null);
    setFormData(defaultFormData);
    setMessage("");
    setError("");
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setIsEditing(true);
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      image: category.image,
      priority: category.priority,
    });
    setMessage("");
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setIsEditing(false);
    setFormData(defaultFormData);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这个分类吗？删除后商品分类展示可能受到影响。")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "分类删除失败");
      }
      setMessage("分类已删除");
      fetchCategories();
    } catch (err: any) {
      setError(err.message || "分类删除失败");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        slug: formData.name.trim().toLowerCase().replace(/\s+/g, "-"),
      };
      const response = await fetch(
        isEditing && editingCategory ? `/api/admin/categories/${editingCategory.id}` : "/api/admin/categories",
        {
          method: isEditing && editingCategory ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "分类保存失败");
      }
      setMessage(isEditing ? "分类已更新" : "分类已添加");
      closeModal();
      fetchCategories();
    } catch (err: any) {
      setError(err.message || "分类保存失败");
    }
  };

  const columns = [
    {
      key: "priority",
      title: "优先级",
      width: "90px",
      render: (category: Category) => (
        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
          #{category.priority}
        </span>
      ),
    },
    {
      key: "image",
      title: "分类图",
      width: "90px",
      render: (category: Category) => (
        <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
          {category.image ? (
            <Image
              src={category.image}
              alt={category.name}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">无图</div>
          )}
        </div>
      ),
    },
    {
      key: "name",
      title: "分类信息",
      render: (category: Category) => (
        <div className="min-w-0">
          <div className="font-semibold text-slate-950">{category.name}</div>
          <div className="mt-1 max-w-xl truncate text-xs text-slate-500">
            {category.description || "暂无分类描述"}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      title: "资料完整度",
      width: "130px",
      render: (category: Category) => {
        const complete = Boolean(category.image && category.description);
        return (
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${complete ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-amber-100"}`}>
            {complete ? "完整" : "待补充"}
          </span>
        );
      },
    },
    {
      key: "actions",
      title: "操作",
      width: "150px",
      align: "right" as const,
      render: (category: Category) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => openEditModal(category)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <PencilSquareIcon className="h-4 w-4" />
            编辑
          </button>
          <button
            type="button"
            onClick={() => handleDelete(category.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <TrashIcon className="h-4 w-4" />
            删除
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Product Center"
        title="分类管理"
        description="统一维护商品分类、展示优先级和分类图片，保证商品中心的基础资料清晰可控。"
        breadcrumbs={[
          { label: "后台管理", href: "/admin/dashboard" },
          { label: "商品中心" },
          { label: "分类管理" },
        ]}
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800"
          >
            <PlusIcon className="h-5 w-5" />
            新增分类
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <AdminCard className="bg-gradient-to-br from-blue-50 to-white">
          <div className="text-sm font-medium text-slate-500">分类总数</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{metrics.total}</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-medium text-slate-500">有展示图</div>
          <div className="mt-3 text-3xl font-semibold text-emerald-700">{metrics.withImage}</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-medium text-slate-500">描述待补充</div>
          <div className="mt-3 text-3xl font-semibold text-amber-600">{metrics.withoutDescription}</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-medium text-slate-500">最高优先级</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">#{metrics.highestPriority}</div>
        </AdminCard>
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <AdminCard
        title="分类列表"
        description="按优先级升序展示，数字越小越靠前。建议补齐图片和描述，提升前台导航与商品筛选体验。"
      >
        {isLoading || sortedCategories.length ? (
          <AdminTable
            columns={columns}
            data={sortedCategories}
            rowKey={(category) => category.id}
            loading={isLoading}
            emptyTitle="暂无分类"
            emptyDescription="请新增商品分类后再维护商品资料。"
          />
        ) : (
          <EmptyState
            title="暂无分类"
            description="分类是商品管理的基础资料，建议先建立核心商品分类。"
            action={
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                新增分类
              </button>
            }
          />
        )}
      </AdminCard>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{isEditing ? "编辑分类" : "新增分类"}</h2>
                <p className="mt-1 text-sm text-slate-500">维护分类名称、图片和前台展示顺序。</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">分类名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">分类描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  rows={3}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">图片 URL</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">展示优先级</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 0 })}
                  min="0"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  required
                />
                <p className="mt-2 text-xs text-slate-500">数字越小越靠前，建议核心分类设置为 0、1、2。</p>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
                >
                  {isEditing ? "保存修改" : "添加分类"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
