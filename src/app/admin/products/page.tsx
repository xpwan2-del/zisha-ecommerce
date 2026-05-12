"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useCategories } from "@/hooks/useCategories";
import { usePromotions } from "@/hooks/usePromotions";
import { useActivities } from "@/hooks/useActivities";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/ui/admin-table";
import { FilterBar } from "@/components/admin/ui/filter-bar";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface Product {
  id: number;
  name: string;
  name_en: string;
  name_ar: string;
  price: number;
  price_usd: number;
  price_ae: number;
  image: string;
  images: string[];
  category_id: number;
  category_name: string;
  quantity: number;
  stock_status_name: string;
  stock_status_color: string;
  is_limited: number;
  display_mode: string;
  promotions: PromotionItem[];
  activities: ActivityItem[];
}

interface PromotionItem {
  promotion_id: number;
  original_price: number;
  start_time?: string;
  end_time?: string;
  priority?: number;
  can_stack?: number;
}

interface ActivityItem {
  activity_category_id: number;
  start_time?: string;
  end_time?: string;
}

interface ProductFormData {
  name: string;
  name_en: string;
  name_ar: string;
  price: number;
  price_usd: number;
  price_ae: number;
  category_id: number | null;
  description: string;
  description_en: string;
  description_ar: string;
  image: string;
  images: string;
  is_limited: number;
  quantity: number;
  promotions: PromotionItem[];
  activities: ActivityItem[];
}

const initialFormData: ProductFormData = {
  name: "",
  name_en: "",
  name_ar: "",
  price: 0,
  price_usd: 0,
  price_ae: 0,
  category_id: null,
  description: "",
  description_en: "",
  description_ar: "",
  image: "",
  images: "",
  is_limited: 0,
  quantity: 0,
  promotions: [],
  activities: []
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });

  const [formData, setFormData] = useState<ProductFormData>(initialFormData);

  const { categories } = useCategories();
  const { promotions } = usePromotions();
  const { activities } = useActivities();

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "15");
      if (searchTerm) params.append("search", searchTerm);
      if (categoryFilter) params.append("categoryId", categoryFilter);

      const response = await fetch(`/api/admin/products?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setProducts(result.data.products || []);
        setPagination(result.data.pagination || { total: 0, total_pages: 1 });
      } else {
        setError("获取商品列表失败");
      }
    } catch (err) {
      setError("网络错误");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSelectProduct = async (product: Product) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/products/${product.id}`);
      const result = await response.json();

      if (result.success) {
        const fullProduct = result.data;
        setSelectedProduct(fullProduct);
        setFormData({
          name: fullProduct.name || "",
          name_en: fullProduct.name_en || "",
          name_ar: fullProduct.name_ar || "",
          price: fullProduct.price || 0,
          price_usd: fullProduct.price_usd || 0,
          price_ae: fullProduct.price_ae || 0,
          category_id: fullProduct.category_id,
          description: fullProduct.description || "",
          description_en: fullProduct.description_en || "",
          description_ar: fullProduct.description_ar || "",
          image: fullProduct.image || "",
          images: Array.isArray(fullProduct.images) ? fullProduct.images.join(",") : "",
          is_limited: fullProduct.is_limited || 0,
          quantity: fullProduct.inventory?.quantity || 0,
          promotions: fullProduct.promotions?.map((p: any) => ({
            promotion_id: p.promotion_id,
            original_price: p.original_price,
            start_time: p.start_time,
            end_time: p.end_time,
            priority: p.priority,
            can_stack: p.can_stack
          })) || [],
          activities: fullProduct.activities?.map((a: any) => ({
            activity_category_id: a.activity_category_id,
            start_time: a.start_time,
            end_time: a.end_time
          })) || []
        });
        setIsCreating(false);
        setIsEditorOpen(true);
      }
    } catch (err) {
      setError("获取商品详情失败");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreator = () => {
    setFormData(initialFormData);
    setIsCreating(true);
    setSelectedProduct(null);
    setIsEditorOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value ? parseFloat(value) : 0 }));
  };

  const handleAddPromotion = (promotionId: number) => {
    if (!formData.promotions.find((p) => p.promotion_id === promotionId)) {
      setFormData((prev) => ({
        ...prev,
        promotions: [
          ...prev.promotions,
          {
            promotion_id: promotionId,
            original_price: formData.price || 0,
            priority: 2,
            can_stack: 1
          }
        ]
      }));
    }
  };

  const handleRemovePromotion = (promotionId: number) => {
    setFormData((prev) => ({
      ...prev,
      promotions: prev.promotions.filter((p) => p.promotion_id !== promotionId)
    }));
  };

  const handleAddActivity = (activityId: number) => {
    if (!formData.activities.find((a) => a.activity_category_id === activityId)) {
      setFormData((prev) => ({
        ...prev,
        activities: [
          ...prev.activities,
          {
            activity_category_id: activityId
          }
        ]
      }));
    }
  };

  const handleRemoveActivity = (activityId: number) => {
    setFormData((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.activity_category_id !== activityId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      setIsLoading(true);
      const submitData = {
        ...formData,
        images: formData.images ? formData.images.split(",").map((s) => s.trim()).filter(Boolean) : []
      };

      const url = isCreating ? "/api/admin/products" : `/api/admin/products/${selectedProduct?.id}`;
      const method = isCreating ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData)
      });
      const result = await response.json();

      if (result.success) {
        setMessage(isCreating ? "商品创建成功！" : "商品更新成功！");
        setIsEditorOpen(false);
        fetchProducts();
      } else {
        setError(result.error || "操作失败");
      }
    } catch (err) {
      setError("操作失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    if (!confirm(`确定要删除商品「${selectedProduct.name}」吗？此操作不可恢复！`)) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/products/${selectedProduct.id}`, {
        method: "DELETE"
      });
      const result = await response.json();

      if (result.success) {
        setMessage("商品删除成功！");
        setIsEditorOpen(false);
        fetchProducts();
      } else {
        setError(result.error || "删除失败");
      }
    } catch (err) {
      setError("删除失败");
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      key: "id",
      title: "ID",
      width: "60px",
      render: (p: Product) => <span className="text-slate-500">{p.id}</span>
    },
    {
      key: "name",
      title: "商品信息",
      render: (p: Product) => (
        <div className="flex items-center gap-3">
          {p.image && (
            <Image
              src={p.image}
              className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200"
              alt={p.name}
              width={40}
              height={40}
            />
          )}
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-950">{p.name}</div>
            <div className="truncate text-xs text-slate-500">{p.name_en}</div>
          </div>
        </div>
      )
    },
    {
      key: "category",
      title: "分类",
      render: (p: Product) => <span className="text-slate-700">{p.category_name}</span>
    },
    {
      key: "price",
      title: "价格 (AED)",
      render: (p: Product) => <span className="font-semibold text-slate-950">{p.price}</span>
    },
    {
      key: "stock",
      title: "库存",
      render: (p: Product) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-950">{p.quantity}</span>
          <StatusBadge
            tone={p.quantity <= 0 ? "danger" : p.quantity <= 10 ? "warning" : "success"}
          >
            {p.stock_status_name}
          </StatusBadge>
        </div>
      )
    },
    {
      key: "actions",
      title: "操作",
      align: "right" as const,
      render: (p: Product) => (
        <button onClick={() => handleSelectProduct(p)} className="font-medium text-blue-700 hover:text-blue-900">
          编辑
        </button>
      )
    }
  ];

  const metrics = useMemo(() => {
    const total = products.length;
    const lowStock = products.filter((product) => Number(product.quantity || 0) > 0 && Number(product.quantity || 0) <= 10).length;
    const outOfStock = products.filter((product) => Number(product.quantity || 0) <= 0).length;
    const limited = products.filter((product) => Number(product.is_limited || 0) === 1).length;
    return { total, lowStock, outOfStock, limited };
  }, [products]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="商品中心"
        title="商品运营中心"
        description="统一管理线上商城的商品资料、价格、库存风险、上架状态和批量运营动作。"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
              批量运营
            </button>
            <button onClick={openCreator} className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">
              <PlusIcon className="h-4 w-4" />
              新增商品
            </button>
          </div>
        }
        breadcrumbs={[{ label: "后台", href: "/admin/dashboard" }, { label: "商品运营中心" }]}
      />

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <AdminCard title="当前商品">
          <p className="mt-2 text-3xl font-semibold text-slate-950">{metrics.total}</p>
          <p className="mt-1 text-xs text-slate-500">当前筛选结果内 SKU 数</p>
        </AdminCard>
        <AdminCard title="库存风险">
          <p className="mt-2 text-3xl font-semibold text-amber-600">{metrics.lowStock + metrics.outOfStock}</p>
          <p className="mt-1 text-xs text-slate-500">低库存 {metrics.lowStock} / 缺货 {metrics.outOfStock}</p>
        </AdminCard>
        <AdminCard title="上架状态">
          <p className="mt-2 text-3xl font-semibold text-blue-600">{metrics.limited}</p>
          <p className="mt-1 text-xs text-slate-500">限量或重点运营商品</p>
        </AdminCard>
        <AdminCard title="批量运营">
          <p className="mt-2 text-sm font-semibold text-slate-950">价格、库存、促销统一处理</p>
          <p className="mt-2 text-xs text-slate-500">建议先筛选目标商品，再执行批量动作</p>
        </AdminCard>
      </div>

      <AdminCard title="筛选条件">
        <FilterBar action={<button onClick={fetchProducts} className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">查询</button>}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-600">
              <span>名称搜索</span>
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="商品名称 / 英文名" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition-colors focus:border-blue-500" />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span>分类</span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition-colors focus:border-blue-500">
                <option value="">全部分类</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </label>
          </div>
        </FilterBar>
      </AdminCard>

      <AdminCard title="商品列表" description={`共查询到 ${pagination.total} 件商品`}>
        <AdminTable
          columns={columns}
          data={products}
          rowKey={(p) => p.id}
          loading={isLoading}
          onRowClick={handleSelectProduct}
        />
        {pagination.total_pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              上一页
            </button>
            <span className="text-sm text-slate-500">第 {page} / {pagination.total_pages} 页</span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              disabled={page === pagination.total_pages}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        )}
      </AdminCard>

      {/* 编辑/新增抽屉/模态框 */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-8 py-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{isCreating ? "新增商品" : `编辑商品 (ID: ${selectedProduct?.id})`}</h3>
                <p className="text-sm text-slate-500">{isCreating ? "填写商品基本信息及库存" : "修改商品详细信息、价格及活动"}</p>
              </div>
              <button onClick={() => setIsEditorOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8">
              <form id="product-form" onSubmit={handleSubmit} className="space-y-8">
                <section className="space-y-4">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                    <span className="h-px w-8 bg-slate-200"></span>
                    基本信息
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FormField label="名称 (中文) *" required>
                      <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                    </FormField>
                    <FormField label="名称 (English)">
                      <input type="text" name="name_en" value={formData.name_en} onChange={handleInputChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                    </FormField>
                    <FormField label="名称 (العربية)" dir="rtl">
                      <input type="text" name="name_ar" value={formData.name_ar} onChange={handleInputChange} dir="rtl" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FormField label="分类 *" required>
                      <select name="category_id" value={formData.category_id || ""} onChange={handleInputChange} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                        <option value="">请选择分类</option>
                        {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </FormField>
                    <FormField label="价格 (AED) *" required>
                      <input type="number" name="price_ae" value={formData.price_ae || ""} onChange={handleNumberChange} step="0.01" min="0" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                    </FormField>
                    <FormField label="价格 (USD)">
                      <input type="number" name="price_usd" value={formData.price_usd || ""} onChange={handleNumberChange} step="0.01" min="0" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="参考原价 (用于折扣计算)">
                      <input type="number" name="price" value={formData.price || ""} onChange={handleNumberChange} step="0.01" min="0" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                    </FormField>
                    <FormField label="库存数量" required>
                      <input type="number" name="quantity" value={formData.quantity || ""} onChange={handleNumberChange} min="0" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                    </FormField>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                    <span className="h-px w-8 bg-slate-200"></span>
                    媒体与描述
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="主图 URL">
                      <input type="text" name="image" value={formData.image} onChange={handleInputChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="https://..." />
                    </FormField>
                    <FormField label="详情图 (逗号分隔)">
                      <input type="text" name="images" value={formData.images} onChange={handleInputChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="url1, url2..." />
                    </FormField>
                  </div>
                  <FormField label="描述 (中文)">
                    <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </FormField>
                  <FormField label="描述 (English)">
                    <textarea name="description_en" value={formData.description_en} onChange={handleInputChange} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </FormField>
                </section>

                <section className="space-y-4">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                    <span className="h-px w-8 bg-slate-200"></span>
                    促销与标签
                  </h4>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-500">促销活动</p>
                      <div className="flex flex-wrap gap-2">
                        {promotions.filter(p => !formData.promotions.find(fp => fp.promotion_id === p.id)).map(promo => (
                          <button key={promo.id} type="button" onClick={() => handleAddPromotion(promo.id)} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 hover:bg-blue-100">+ {promo.name}</button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {formData.promotions.map(promo => {
                          const info = promotions.find(p => p.id === promo.promotion_id);
                          return (
                            <div key={promo.promotion_id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                              <span className="text-sm font-medium text-slate-700">{info?.name}</span>
                              <button type="button" onClick={() => handleRemovePromotion(promo.promotion_id)} className="text-slate-400 hover:text-rose-600"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-500">活动标签</p>
                      <div className="flex flex-wrap gap-2">
                        {activities.filter(a => !formData.activities.find(fa => fa.activity_category_id === a.id)).map(act => (
                          <button key={act.id} type="button" onClick={() => handleAddActivity(act.id)} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-100">+ {act.name}</button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {formData.activities.map(act => {
                          const info = activities.find(a => a.id === act.activity_category_id);
                          return (
                            <div key={act.activity_category_id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                              <span className="text-sm font-medium text-slate-700">{info?.name}</span>
                              <button type="button" onClick={() => handleRemoveActivity(act.activity_category_id)} className="text-slate-400 hover:text-rose-600"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              </form>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-8 py-5">
              {!isCreating ? (
                <button type="button" onClick={handleDelete} className="flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700">
                  <TrashIcon className="h-5 w-5" />
                  删除商品
                </button>
              ) : <div></div>}
              <div className="flex gap-3">
                <button onClick={() => setIsEditorOpen(false)} className="rounded-lg border border-slate-200 bg-white px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">取消</button>
                <button type="submit" form="product-form" disabled={isLoading} className="rounded-lg bg-slate-950 px-8 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300">
                  {isLoading ? "处理中..." : "保存并发布"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, required, children, dir }: { label: string; required?: boolean; children: React.ReactNode; dir?: string }) {
  return (
    <div className="space-y-1.5" dir={dir}>
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}
