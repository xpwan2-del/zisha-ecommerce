"use client";

import { useState, useEffect } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { usePromotions } from '@/hooks/usePromotions';
import { useActivities } from '@/hooks/useActivities';

type TabType = 'create' | 'update';

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
  name: '',
  name_en: '',
  name_ar: '',
  price: 0,
  price_usd: 0,
  price_ae: 0,
  category_id: null,
  description: '',
  description_en: '',
  description_ar: '',
  image: '',
  images: '',
  is_limited: 0,
  quantity: 0,
  promotions: [],
  activities: []
};

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });

  const [formData, setFormData] = useState<ProductFormData>(initialFormData);

  const { categories } = useCategories();
  const { promotions } = usePromotions();
  const { activities } = useActivities();

  useEffect(() => {
    if (activeTab === 'update') {
      fetchProducts();
    }
  }, [activeTab, page, categoryFilter, minPrice, maxPrice, searchTerm]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('categoryId', categoryFilter);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);

      const response = await fetch(`/api/admin/products?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setProducts(result.data.products || []);
        setPagination(result.data.pagination || { total: 0, total_pages: 1 });
        setTotalPages(result.data.pagination?.total_pages || 1);
      } else {
        setError('获取商品列表失败');
      }
    } catch (err) {
      setError('网络错误');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchProducts();
  };

  const handleReset = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  };

  const handleSelectProduct = async (product: Product) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/products/${product.id}`);
      const result = await response.json();

      if (result.success) {
        const fullProduct = result.data;
        setSelectedProduct(fullProduct);
        setFormData({
          name: fullProduct.name || '',
          name_en: fullProduct.name_en || '',
          name_ar: fullProduct.name_ar || '',
          price: fullProduct.price || 0,
          price_usd: fullProduct.price_usd || 0,
          price_ae: fullProduct.price_ae || 0,
          category_id: fullProduct.category_id,
          description: fullProduct.description || '',
          description_en: fullProduct.description_en || '',
          description_ar: fullProduct.description_ar || '',
          image: fullProduct.image || '',
          images: Array.isArray(fullProduct.images) ? fullProduct.images.join(',') : '',
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
      }
    } catch (err) {
      setError('获取商品详情失败');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : 0 }));
  };

  const handlePromotionChange = (promotionId: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      promotions: prev.promotions.map(p =>
        p.promotion_id === promotionId ? { ...p, [field]: value } : p
      )
    }));
  };

  const handleAddPromotion = (promotionId: number) => {
    if (!formData.promotions.find(p => p.promotion_id === promotionId)) {
      const promotion = promotions.find(p => p.id === promotionId);
      setFormData(prev => ({
        ...prev,
        promotions: [...prev.promotions, {
          promotion_id: promotionId,
          original_price: formData.price || 0,
          start_time: '',
          end_time: '',
          priority: 2,
          can_stack: 1
        }]
      }));
    }
  };

  const handleRemovePromotion = (promotionId: number) => {
    setFormData(prev => ({
      ...prev,
      promotions: prev.promotions.filter(p => p.promotion_id !== promotionId)
    }));
  };

  const handleAddActivity = (activityId: number) => {
    if (!formData.activities.find(a => a.activity_category_id === activityId)) {
      setFormData(prev => ({
        ...prev,
        activities: [...prev.activities, {
          activity_category_id: activityId,
          start_time: '',
          end_time: ''
        }]
      }));
    }
  };

  const handleRemoveActivity = (activityId: number) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.filter(a => a.activity_category_id !== activityId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      setIsLoading(true);

      const submitData = {
        ...formData,
        images: formData.images ? formData.images.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      let response;
      let result;

      if (activeTab === 'create') {
        response = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
        result = await response.json();

        if (result.success) {
          setSuccessMessage('商品创建成功！');
          setFormData(initialFormData);
          if (formData.promotions.length > 0 || formData.activities.length > 0) {
            setFormData(prev => ({ ...prev, promotions: [], activities: [] }));
          }
        } else {
          setError(result.error || '创建失败');
        }
      } else if (selectedProduct) {
        response = await fetch(`/api/admin/products/${selectedProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
        result = await response.json();

        if (result.success) {
          setSuccessMessage('商品更新成功！');
          fetchProducts();
        } else {
          setError(result.error || '更新失败');
        }
      }
    } catch (err) {
      setError('操作失败');
      console.error(err);
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
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        setSuccessMessage('商品删除成功！');
        setSelectedProduct(null);
        setFormData(initialFormData);
        fetchProducts();
        setActiveTab('create');
      } else {
        setError(result.error || '删除失败');
      }
    } catch (err) {
      setError('删除失败');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedProduct(null);
    setFormData(initialFormData);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">商品管理</h1>

      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'create'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ➕ 新增商品
        </button>
        <button
          onClick={() => setActiveTab('update')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'update'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📝 更新商品
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">新增商品</h2>
          <form onSubmit={handleSubmit}>
            <FormSection title="基本信息">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="名称 (中文) *" required>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </FormField>
                <FormField label="名称 (English)">
                  <input
                    type="text"
                    name="name_en"
                    value={formData.name_en}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </FormField>
                <FormField label="名称 (العربية)">
                  <input
                    type="text"
                    name="name_ar"
                    value={formData.name_ar}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    dir="rtl"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="分类 *" required>
                  <select
                    name="category_id"
                    value={formData.category_id || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    required
                  >
                    <option value="">请选择分类</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="价格 (USD)">
                  <input
                    type="number"
                    name="price_usd"
                    value={formData.price_usd || ''}
                    onChange={handleNumberChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </FormField>
                <FormField label="价格 (AED) *" required>
                  <input
                    type="number"
                    name="price_ae"
                    value={formData.price_ae || ''}
                    onChange={handleNumberChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="价格 (原价计算用)">
                  <input
                    type="number"
                    name="price"
                    value={formData.price || ''}
                    onChange={handleNumberChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="用于计算促销折扣"
                  />
                </FormField>
                <FormField label="是否限量">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="is_limited"
                        value="1"
                        checked={formData.is_limited === 1}
                        onChange={() => setFormData(prev => ({ ...prev, is_limited: 1 }))}
                        className="mr-2"
                      />
                      是
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="is_limited"
                        value="0"
                        checked={formData.is_limited === 0}
                        onChange={() => setFormData(prev => ({ ...prev, is_limited: 0 }))}
                        className="mr-2"
                      />
                      否
                    </label>
                  </div>
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="主图 URL">
                  <input
                    type="text"
                    name="image"
                    value={formData.image}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="https://..."
                  />
                </FormField>
                <FormField label="详情图 URL (多个用逗号分隔)">
                  <input
                    type="text"
                    name="images"
                    value={formData.images}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="https://..., https://..."
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField label="描述 (中文)">
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </FormField>
                <FormField label="描述 (English)">
                  <textarea
                    name="description_en"
                    value={formData.description_en}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </FormField>
                <FormField label="描述 (العربية)" dir="rtl">
                  <textarea
                    name="description_ar"
                    value={formData.description_ar}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    dir="rtl"
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="库存信息">
              <FormField label="库存数量 *" required>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity || ''}
                  onChange={handleNumberChange}
                  min="0"
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </FormField>
            </FormSection>

            <FormSection title="促销活动">
              <div className="flex flex-wrap gap-2 mb-3">
                {promotions.filter(p => !formData.promotions.find(fp => fp.promotion_id === p.id)).map(promo => (
                  <button
                    key={promo.id}
                    type="button"
                    onClick={() => handleAddPromotion(promo.id)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200"
                  >
                    + {promo.name}
                  </button>
                ))}
              </div>
              {formData.promotions.length > 0 && (
                <div className="space-y-3">
                  {formData.promotions.map(promo => {
                    const promoInfo = promotions.find(p => p.id === promo.promotion_id);
                    return (
                      <div key={promo.promotion_id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="flex-1">
                          <div className="font-medium">{promoInfo?.name}</div>
                          <div className="text-sm text-gray-500">
                            原价: <input
                              type="number"
                              value={promo.original_price || ''}
                              onChange={(e) => handlePromotionChange(promo.promotion_id, 'original_price', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 border rounded"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePromotion(promo.promotion_id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </FormSection>

            <FormSection title="活动标签">
              <div className="flex flex-wrap gap-2 mb-3">
                {activities.filter(a => !formData.activities.find(fa => fa.activity_category_id === a.id)).map(act => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleAddActivity(act.id)}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200"
                  >
                    + {act.name}
                  </button>
                ))}
              </div>
              {formData.activities.length > 0 && (
                <div className="space-y-3">
                  {formData.activities.map(act => {
                    const actInfo = activities.find(a => a.id === act.activity_category_id);
                    return (
                      <div key={act.activity_category_id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="flex-1">{actInfo?.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveActivity(act.activity_category_id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </FormSection>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
              >
                {isLoading ? '处理中...' : '保存并发布'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'update' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">搜索 & 筛选</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="名称搜索">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="输入商品名称..."
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                />
              </FormField>
              <FormField label="分类">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">全部</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="最低价格">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                />
              </FormField>
              <FormField label="最高价格">
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="99999"
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                />
              </FormField>
            </div>
            <div className="flex space-x-4 mt-4">
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                搜索
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                重置
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="text-left py-3 px-4">ID</th>
                    <th className="text-left py-3 px-4">商品名称</th>
                    <th className="text-left py-3 px-4">分类</th>
                    <th className="text-left py-3 px-4">价格</th>
                    <th className="text-left py-3 px-4">库存</th>
                    <th className="text-left py-3 px-4">状态</th>
                    <th className="text-left py-3 px-4">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        暂无商品
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr
                        key={product.id}
                        className={`border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedProduct?.id === product.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                        }`}
                        onClick={() => handleSelectProduct(product)}
                      >
                        <td className="py-3 px-4">{product.id}</td>
                        <td className="py-3 px-4">{product.name}</td>
                        <td className="py-3 px-4">{product.category_name}</td>
                        <td className="py-3 px-4">AED {product.price}</td>
                        <td className="py-3 px-4">{product.quantity}</td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: product.stock_status_color + '20',
                              color: product.stock_status_color
                            }}
                          >
                            {product.stock_status_name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectProduct(product);
                            }}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            编辑
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination.total > 10 && (
              <div className="flex justify-center items-center space-x-2 py-4 border-t">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="px-3">
                  第 {page} / {totalPages} 页，共 {pagination.total} 条
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            )}
          </div>

          {selectedProduct && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                商品详情 (ID: {selectedProduct.id})
              </h2>
              <form onSubmit={handleSubmit}>
                <FormSection title="基本信息">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="名称 (中文) *" required>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                        required
                      />
                    </FormField>
                    <FormField label="名称 (English)">
                      <input
                        type="text"
                        name="name_en"
                        value={formData.name_en}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </FormField>
                    <FormField label="名称 (العربية)">
                      <input
                        type="text"
                        name="name_ar"
                        value={formData.name_ar}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                        dir="rtl"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="分类 *" required>
                      <select
                        name="category_id"
                        value={formData.category_id || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                        required
                      >
                        <option value="">请选择分类</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="价格 (USD)">
                      <input
                        type="number"
                        name="price_usd"
                        value={formData.price_usd || ''}
                        onChange={handleNumberChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </FormField>
                    <FormField label="价格 (AED) *" required>
                      <input
                        type="number"
                        name="price_ae"
                        value={formData.price_ae || ''}
                        onChange={handleNumberChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                        required
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="价格 (原价计算用)">
                      <input
                        type="number"
                        name="price"
                        value={formData.price || ''}
                        onChange={handleNumberChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </FormField>
                    <FormField label="是否限量">
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="is_limited"
                            value="1"
                            checked={formData.is_limited === 1}
                            onChange={() => setFormData(prev => ({ ...prev, is_limited: 1 }))}
                            className="mr-2"
                          />
                          是
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="is_limited"
                            value="0"
                            checked={formData.is_limited === 0}
                            onChange={() => setFormData(prev => ({ ...prev, is_limited: 0 }))}
                            className="mr-2"
                          />
                          否
                        </label>
                      </div>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="主图 URL">
                      <input
                        type="text"
                        name="image"
                        value={formData.image}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </FormField>
                    <FormField label="详情图 URL (多个用逗号分隔)">
                      <input
                        type="text"
                        name="images"
                        value={formData.images}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </FormField>
                  </div>
                </FormSection>

                <FormSection title="库存信息">
                  <FormField label="库存数量 *" required>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity || ''}
                      onChange={handleNumberChange}
                      min="0"
                      className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  </FormField>
                </FormSection>

                <FormSection title="促销活动">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {promotions.filter(p => !formData.promotions.find(fp => fp.promotion_id === p.id)).map(promo => (
                      <button
                        key={promo.id}
                        type="button"
                        onClick={() => handleAddPromotion(promo.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200"
                      >
                        + {promo.name}
                      </button>
                    ))}
                  </div>
                  {formData.promotions.length > 0 && (
                    <div className="space-y-3">
                      {formData.promotions.map(promo => {
                        const promoInfo = promotions.find(p => p.id === promo.promotion_id);
                        return (
                          <div key={promo.promotion_id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                            <div className="flex-1">
                              <div className="font-medium">{promoInfo?.name}</div>
                              <div className="text-sm text-gray-500">
                                原价: <input
                                  type="number"
                                  value={promo.original_price || ''}
                                  onChange={(e) => handlePromotionChange(promo.promotion_id, 'original_price', parseFloat(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 border rounded"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePromotion(promo.promotion_id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </FormSection>

                <FormSection title="活动标签">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {activities.filter(a => !formData.activities.find(fa => fa.activity_category_id === a.id)).map(act => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => handleAddActivity(act.id)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200"
                      >
                        + {act.name}
                      </button>
                    ))}
                  </div>
                  {formData.activities.length > 0 && (
                    <div className="space-y-3">
                      {formData.activities.map(act => {
                        const actInfo = activities.find(a => a.id === act.activity_category_id);
                        return (
                          <div key={act.activity_category_id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                            <span className="flex-1">{actInfo?.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveActivity(act.activity_category_id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </FormSection>

                <div className="flex justify-between mt-6">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    删除商品
                  </button>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isLoading ? '处理中...' : '保存修改'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-3 pb-2 border-b">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FormField({ label, required, children, dir }: { label: string; required?: boolean; children: React.ReactNode; dir?: string }) {
  return (
    <div dir={dir}>
      <label className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}