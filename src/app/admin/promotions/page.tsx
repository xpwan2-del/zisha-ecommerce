"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/ui/admin-table";
import { EmptyState } from "@/components/admin/ui/empty-state";

interface Promotion {
  id: number;
  name: string;
  description: string;
  type: string;
  discount_percent: number;
  status: 'active' | 'inactive';
  product_count: number;
  total_order_count: number;
  total_discount_amount: number;
  image?: string; 
  created_at: string;
}

interface PromotionFormData {
  name: string;
  description: string;
  type: string;
  discount_percent: number;
  status: 'active' | 'inactive';
  image: string;
}

const defaultFormData: PromotionFormData = {
  name: "",
  description: "",
  type: "percentage",
  discount_percent: 0,
  status: 'active',
  image: "",
};

const formatDate = (date: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("zh-CN", { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const getPromotionStage = (promotion: Promotion) => {
  if (promotion.status === 'active') {
    return { label: "进行中", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" };
  }
  return { label: "已停用", className: "bg-slate-100 text-slate-600 ring-slate-200" };
};

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState<PromotionFormData>(defaultFormData);

  const fetchPromotions = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/promotions");
      const result = await response.json();
      if (response.ok && result.success) {
        setPromotions(result.data);
      } else {
        setError(result.error || "促销数据加载失败，请稍后重试");
        setPromotions([]);
      }
    } catch (err) {
      setError("促销数据加载失败，请检查网络或接口状态");
      setPromotions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const metrics = useMemo(() => {
    const active = promotions.filter((p) => p.status === 'active').length;
    const inactive = promotions.filter((p) => p.status === 'inactive').length;
    const totalDiscount = promotions.reduce((sum, p) => sum + (p.total_discount_amount || 0), 0);
    const avgDiscount = promotions.length
      ? Math.round(promotions.reduce((sum, p) => sum + Number(p.discount_percent || 0), 0) / promotions.length)
      : 0;

    return { total: promotions.length, active, inactive, totalDiscount, avgDiscount };
  }, [promotions]);

  const resetForm = () => {
    setFormData(defaultFormData);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPromotion(null);
    resetForm();
  };

  const openEditModal = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      description: promotion.description,
      type: promotion.type,
      discount_percent: promotion.discount_percent,
      status: promotion.status,
      image: promotion.image || "",
    });
    setMessage("");
    setError("");
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingPromotion(null);
    resetForm();
    setMessage("");
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const url = editingPromotion ? `/api/admin/promotions/${editingPromotion.id}` : "/api/admin/promotions";
    const method = editingPromotion ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        closeModal();
        setMessage(editingPromotion ? "促销已更新" : "促销已创建");
        await fetchPromotions();
      } else {
        setError(result.error || "促销保存失败");
      }
    } catch (err) {
      setError("促销保存失败，请稍后重试");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除这个促销活动吗？删除后相关营销展示可能受到影响。")) return;

    setError("");
    try {
      const response = await fetch(`/api/admin/promotions/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (response.ok && result.success) {
        setMessage("促销已删除");
        await fetchPromotions();
      } else {
        setError(result.error || "促销删除失败");
      }
    } catch (err) {
      setError("促销删除失败，请稍后重试");
    }
  };

  const columns = [
    {
      key: "name",
      title: "促销信息",
      render: (promotion: Promotion) => (
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-16 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
            {promotion.image ? (
              <Image
                src={promotion.image}
                alt={promotion.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">无图</div>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-950">{promotion.name}</div>
            <div className="mt-1 max-w-md truncate text-xs text-slate-500">{promotion.description}</div>
          </div>
        </div>
      ),
    },
    {
      key: "discount",
      title: "折扣",
      width: "100px",
      render: (promotion: Promotion) => (
        <span className="text-lg font-semibold text-red-600">{promotion.discount_percent}%</span>
      ),
    },
    {
      key: "stats",
      title: "效果统计",
      width: "150px",
      render: (promotion: Promotion) => (
        <div className="text-sm text-slate-700">
          <div>影响订单: {promotion.total_order_count}</div>
          <div className="text-xs text-slate-500">
            总折扣额: ¥{promotion.total_discount_amount.toFixed(2)}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      title: "状态",
      width: "110px",
      render: (promotion: Promotion) => {
        const stage = getPromotionStage(promotion);
        return (
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${stage.className}`}>
            {stage.label}
          </span>
        );
      },
    },
    {
      key: "products",
      title: "关联商品",
      width: "110px",
      render: (promotion: Promotion) => (
        <span className="text-sm font-medium text-slate-700">{promotion.product_count || 0} 个</span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "150px",
      align: "right" as const,
      render: (promotion: Promotion) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => openEditModal(promotion)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <PencilSquareIcon className="h-4 w-4" />
            编辑
          </button>
          <button
            type="button"
            onClick={() => handleDelete(promotion.id)}
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
        eyebrow="Marketing Center"
        title="促销管理"
        description="统一维护折扣活动、活动周期、启停状态和关联商品，让营销配置更容易追踪和复盘。"
        breadcrumbs={[
          { label: "后台管理", href: "/admin/dashboard" },
          { label: "营销中心" },
          { label: "促销管理" },
        ]}
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800"
          >
            <PlusIcon className="h-5 w-5" />
            新增促销
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-5">
        <AdminCard className="bg-gradient-to-br from-blue-50 to-white">
          <div className="text-sm font-medium text-slate-500">促销总数</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{metrics.total}</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-medium text-slate-500">进行中</div>
          <div className="mt-3 text-3xl font-semibold text-emerald-700">{metrics.active}</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-medium text-slate-500">已停用</div>
          <div className="mt-3 text-3xl font-semibold text-slate-700">{metrics.inactive}</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-medium text-slate-500">总优惠额</div>
          <div className="mt-3 text-3xl font-semibold text-blue-700">¥{metrics.totalDiscount.toFixed(0)}</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-medium text-slate-500">平均折扣</div>
          <div className="mt-3 text-3xl font-semibold text-red-600">{metrics.avgDiscount}%</div>
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
        title="促销列表"
        description="建议定期检查已结束或停用活动，避免前台展示过期营销信息。"
      >
        {isLoading || promotions.length ? (
          <AdminTable
            columns={columns}
            data={promotions}
            rowKey={(promotion) => promotion.id}
            loading={isLoading}
            emptyTitle="暂无促销活动"
            emptyDescription="创建促销活动后，可在这里统一管理活动周期和展示状态。"
          />
        ) : (
          <EmptyState
            title="暂无促销活动"
            description="可先创建一个限时折扣或专题促销，用于商品营销展示。"
            action={
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                新增促销
              </button>
            }
          />
        )}
      </AdminCard>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{editingPromotion ? "编辑促销" : "新增促销"}</h2>
                <p className="mt-1 text-sm text-slate-500">配置促销标题、折扣、类型和启用状态。</p>
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
                <label className="mb-2 block text-sm font-medium text-slate-700">促销标题</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">促销描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  rows={3}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">图片 URL (可选)</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">折扣类型</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="percentage">百分比折扣</option>
                    <option value="fixed">固定金额</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">折扣值 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value, 10) || 0 })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="active">激活</option>
                  <option value="inactive">停用</option>
                </select>
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
                  {editingPromotion ? "保存修改" : "创建促销"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
