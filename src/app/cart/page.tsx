"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCart } from '@/lib/contexts/CartContext';
import { formatCurrency } from '@/lib/utils/currency';
import Image from 'next/image';

interface CartItem {
  id: number;
  product_id: number;
  name: string;
  name_en?: string;
  name_ar?: string;
  price: number;
  original_price?: number;
  quantity: number;
  image: string;
  stock: number;
  stock_status_id?: number;
  stock_status_info?: {
    id: number;
    name: string;
    name_en: string;
    name_ar: string;
  };
  promotion?: {
    id: number;
    promotion_id: number;
    name: string;
    discount_percent: number;
    end_time: string;
    is_expired: boolean;
    promotion_price: number;
    color?: string;
    is_exclusive?: boolean;
  } | null;
  promotions?: Array<{
    id: number;
    name: string;
    discount_percent: number;
    color?: string;
    can_stack: number;
    priority: number;
  }>;
  total_discount_percent?: number;
}

interface CartData {
  items: CartItem[];
  total: number;
  total_items: number;
}

interface StockStatusInfo {
  id: number;
  name: string;
  name_en: string;
  name_ar: string;
}

export default function CartPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { currency } = useCurrency();
  const { user, isAuthenticated } = useAuth();
  const { refreshCart } = useCart();

  const [cartData, setCartData] = useState<CartData>({ items: [], total: 0, total_items: 0 });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchCartData = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/cart', {
        credentials: 'include',
        headers: {
          'x-lang': i18n.language
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCartData(data.data);
        setSelectedItems(data.data.items.map((item: CartItem) => item.id));
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartData();
  }, [isAuthenticated, i18n.language]);

  const getStockStatus = (item: CartItem): StockStatusInfo | null => {
    if (item.stock_status_info) {
      return item.stock_status_info;
    }
    if (item.stock_status_id) {
      const statusMap: Record<number, StockStatusInfo> = {
        1: { id: 1, name: '有货', name_en: 'In Stock', name_ar: 'متوفر' },
        2: { id: 2, name: '库存有限', name_en: 'Limited Stock', name_ar: 'مخزون محدود' },
        3: { id: 3, name: '库存紧张', name_en: 'Low Stock', name_ar: 'مخزون منخفض' },
        4: { id: 4, name: '缺货', name_en: 'Out of Stock', name_ar: 'نفد المخزون' },
      };
      return statusMap[item.stock_status_id] || null;
    }
    return null;
  };

  const getStockStatusText = (item: CartItem): string => {
    const status = getStockStatus(item);
    if (!status) return '';
    if (i18n.language === 'ar') return status.name_ar;
    if (i18n.language === 'en') return status.name_en;
    return status.name;
  };

  const getStockStatusColor = (item: CartItem): string => {
    const status = getStockStatus(item);
    if (!status) return 'var(--color-green)';
    if (status.id === 4) return 'var(--color-red)';
    if (status.id === 3) return 'var(--color-orange)';
    if (status.id === 2) return 'var(--color-yellow)';
    return 'var(--color-green)';
  };

  const [localQuantities, setLocalQuantities] = useState<Record<number, number>>({});

  const handleDecrement = async (itemId: number, currentQuantity: number) => {
    if (currentQuantity <= 1) {
      const item = cartData.items.find(i => i.id === itemId);
      if (!item) return;

      if (!window.confirm(i18n.language === 'ar'
        ? 'حذف هذا المنتج من السلة؟'
        : i18n.language === 'en'
        ? 'Remove this item from cart?'
        : '确定要从购物车删除这个商品吗？')) {
        return;
      }

      setRemovingId(itemId);
      try {
        const response = await fetch(`/api/cart?id=${itemId}`, {
          credentials: 'include',
          method: 'DELETE',
          headers: {
            'x-lang': i18n.language
          }
        });

        if (response.ok) {
          await fetchCartData();
          await refreshCart();
        }
      } catch (error) {
        console.error('Error removing item:', error);
      } finally {
        setRemovingId(null);
      }
      return;
    }

    const item = cartData.items.find(i => i.id === itemId);
    if (!item) return;

    setUpdatingId(itemId);
    try {
      const newQuantity = currentQuantity - 1;
      const response = await fetch('/api/cart', {
        credentials: 'include',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-lang': i18n.language
        },
        body: JSON.stringify({ id: itemId, quantity: newQuantity })
      });

      if (response.ok) {
        setLocalQuantities(prev => ({ ...prev, [itemId]: newQuantity }));
        await fetchCartData();
        await refreshCart();
      }
    } catch (error) {
      console.error('Error decrementing quantity:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleIncrement = async (itemId: number) => {
    const item = cartData.items.find(i => i.id === itemId);
    if (!item) return;

    const currentQty = localQuantities[itemId] ?? item.quantity;

    if (item.stock < 1) {
      alert(i18n.language === 'ar' ? 'المخزون المتاح فقط ' + item.stock : i18n.language === 'en' ? 'Only ' + item.stock + ' available' : '库存不足，仅剩 ' + item.stock + ' 件');
      return;
    }

    setUpdatingId(itemId);

    try {
      const newQuantity = currentQty + 1;
      const response = await fetch('/api/cart', {
        credentials: 'include',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-lang': i18n.language
        },
        body: JSON.stringify({ id: itemId, quantity: newQuantity })
      });

      if (response.ok) {
        setLocalQuantities(prev => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
        await fetchCartData();
        await refreshCart();
      } else {
        const data = await response.json();
        alert(i18n.language === 'ar' ? 'فشل في تحديث الكمية' : i18n.language === 'en' ? 'Failed to update quantity' : '更新数量失败');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedItems.length === 0) return;

    const confirmMessage = i18n.language === 'ar'
      ? `هل أنت متأكد من حذف ${selectedItems.length} منتجات؟`
      : i18n.language === 'en'
      ? `Are you sure you want to remove ${selectedItems.length} items?`
      : `确定要删除选中的 ${selectedItems.length} 个商品吗？`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    for (const itemId of selectedItems) {
      setRemovingId(itemId);
      try {
        await fetch(`/api/cart?id=${itemId}`, {
          credentials: 'include',
          method: 'DELETE',
          headers: {
            'x-lang': i18n.language
          }
        });
      } catch (error) {
        console.error('Error removing item:', error);
      } finally {
        setRemovingId(null);
      }
    }

    setSelectedItems([]);
    await fetchCartData();
    await refreshCart();
  };

  const handleRemoveItem = async (itemId: number) => {
    const confirmMessage = i18n.language === 'ar'
      ? 'هل أنت متأكد من حذف هذا المنتج؟'
      : i18n.language === 'en'
      ? 'Are you sure you want to remove this item?'
      : '确定要删除这个商品吗？';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setRemovingId(itemId);

    try {
      const response = await fetch(`/api/cart?id=${itemId}`, {
        credentials: 'include',
        method: 'DELETE',
        headers: {
          'x-lang': i18n.language
        }
      });

      if (response.ok) {
        await fetchCartData();
        await refreshCart();
      } else {
        alert(i18n.language === 'ar' ? 'فشل في إزالة العنصر' : i18n.language === 'en' ? 'Failed to remove item' : '移除商品失败');
      }
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === cartData.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartData.items.map(item => item.id));
    }
  };

  const handleSelectItem = (itemId: number) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const getSelectedTotal = (): number => {
    return cartData.items
      .filter(item => selectedItems.includes(item.id))
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/cart');
      return;
    }

    if (selectedItems.length === 0) {
      alert(i18n.language === 'ar' ? 'الرجاء تحديد منتج واحد على الأقل' : i18n.language === 'en' ? 'Please select at least one product' : '请至少选择一个商品');
      return;
    }

    router.push(`/checkout?items=${JSON.stringify(selectedItems)}`);
  };

  const handleContinueShopping = () => {
    router.push('/products');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center p-8 rounded-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)', fontFamily: 'var(--heading-font)' }}>
            {i18n.language === 'ar' ? 'سلة التسوق فارغة' : i18n.language === 'en' ? 'Your cart is empty' : '购物车是空的'}
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
            {i18n.language === 'ar' ? 'الرجاء تسجيل الدخول لعرض سلة التسوق' : i18n.language === 'en' ? 'Please login to view your cart' : '请登录后查看购物车'}
          </p>
          <button
            onClick={() => router.push('/login?redirect=/cart')}
            className="btn-primary px-6 py-3 rounded-lg font-medium"
            style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: '1px solid var(--btn-primary-border)' }}
          >
            {i18n.language === 'ar' ? 'تسجيل الدخول' : i18n.language === 'en' ? 'Login' : '登录'}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (cartData.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center p-8 rounded-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)', fontFamily: 'var(--heading-font)' }}>
            {i18n.language === 'ar' ? 'سلة التسوق فارغة' : i18n.language === 'en' ? 'Your cart is empty' : '购物车是空的'}
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
            {i18n.language === 'ar' ? 'لم تقم بإضافة أي منتجات بعد' : i18n.language === 'en' ? 'You haven\'t added any products yet' : '您还没有添加任何商品'}
          </p>
          <button
            onClick={handleContinueShopping}
            className="btn-primary px-6 py-3 rounded-lg font-medium"
            style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: '1px solid var(--btn-primary-border)' }}
          >
            {i18n.language === 'ar' ? 'تسوق الآن' : i18n.language === 'en' ? 'Shop Now' : '立即购物'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--heading-font)' }}>
            {i18n.language === 'ar' ? 'سلة التسوق' : i18n.language === 'en' ? 'Shopping Cart' : '购物车'}
            <span className="text-lg ml-2" style={{ color: 'var(--text-muted)' }}>
              ({cartData.total_items} {i18n.language === 'ar' ? 'منتج' : i18n.language === 'en' ? 'items' : '件商品'})
            </span>
          </h1>
          <button
            onClick={handleContinueShopping}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              background: 'transparent',
              color: 'var(--primary)',
              border: '1px solid var(--border)'
            }}
          >
            {i18n.language === 'ar' ? 'متابعة التسوق' : i18n.language === 'en' ? 'Continue Shopping' : '继续购物'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="rounded-lg overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === cartData.items.length}
                    onChange={handleSelectAll}
                    className="w-5 h-5 rounded mr-3"
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span className="font-medium" style={{ color: 'var(--text)' }}>
                    {i18n.language === 'ar' ? 'تحديد الكل' : i18n.language === 'en' ? 'Select All' : '全选'}
                  </span>
                </div>
                {isEditing && selectedItems.length > 0 && (
                  <button
                    onClick={handleRemoveSelected}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: 'var(--color-red)', color: 'white' }}
                  >
                    {i18n.language === 'ar' ? 'حذف المحدد' : i18n.language === 'en' ? 'Delete Selected' : '删除选中'}
                  </button>
                )}
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: 'transparent',
                    color: 'var(--primary)',
                    border: '1px solid var(--border)'
                  }}
                >
                  {isEditing
                    ? (i18n.language === 'ar' ? 'تم' : i18n.language === 'en' ? 'Done' : '完成')
                    : (i18n.language === 'ar' ? 'تعديل' : i18n.language === 'en' ? 'Edit' : '编辑')}
                </button>
              </div>

              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {cartData.items.map((item) => {
                  const stockStatus = getStockStatus(item);
                  const isOutOfStock = stockStatus?.id === 4;
                  const isLowStock = stockStatus?.id === 3;
                  const isSelected = selectedItems.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`p-4 sm:p-6 transition-opacity ${removingId === item.id ? 'opacity-50' : ''}`}
                      style={{ opacity: isOutOfStock ? 0.6 : 1 }}
                    >
                      <div className="flex items-start sm:items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectItem(item.id)}
                          className="w-5 h-5 rounded mr-3 mt-1 sm:mt-0 flex-shrink-0"
                          style={{ accentColor: 'var(--primary)' }}
                        />

                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={item.image || '/placeholder.jpg'}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>

                        <div className="ml-4 flex-1 min-w-0">
                          <h3 className="font-medium text-base sm:text-lg truncate" style={{ color: 'var(--text)', fontFamily: i18n.language === 'ar' ? 'var(--heading-font)' : 'inherit' }}>
                            {i18n.language === 'ar' ? (item.name_ar || item.name) : i18n.language === 'en' ? (item.name_en || item.name) : item.name}
                          </h3>

                          <div className="flex items-center mt-1">
                            <span className="text-lg sm:text-xl font-bold" style={{ color: 'var(--primary)' }}>
                              {formatCurrency(item.price, currency)}
                            </span>
                            {item.original_price && item.original_price > item.price && (
                              <span className="ml-2 text-sm line-through" style={{ color: 'var(--text-muted)' }}>
                                {formatCurrency(item.original_price, currency)}
                              </span>
                            )}
                          </div>

                          {item.promotion && !item.promotion.is_expired && (
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {/* 总折扣标签 - 红色渐变 */}
                              {item.total_discount_percent && item.total_discount_percent > 0 && (
                                <span className="px-2 py-1 rounded-md shadow-md font-bold text-white text-[10px] sm:text-xs" style={{ background: 'linear-gradient(135deg, #EF4444, rgba(239, 68, 68, 0.6))', boxShadow: 'rgba(0, 0, 0, 0.2) 0px 2px 4px' }}>
                                  最终折扣 {item.total_discount_percent}% OFF SALE
                                </span>
                              )}
                              {/* 每个促销的单独标签 */}
                              {(item.promotions || []).map((promo: any) => {
                                if (['今日特惠', '特惠商品'].includes(promo.name)) return null;
                                return (
                                  <span key={`cart-promo-${promo.id}`} className="text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: promo.color || 'var(--accent)' }}>
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                                    </svg>
                                    {promo.name} - {promo.discount_percent}%
                                  </span>
                                );
                              })}
                              {item.promotion.end_time && (
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  {i18n.language === 'ar' ? `ينتهي: ${new Date(item.promotion.end_time).toLocaleDateString('ar-SA')}` :
                                   i18n.language === 'en' ? `Exp: ${new Date(item.promotion.end_time).toLocaleDateString('en-US')}` :
                                   `截止: ${new Date(item.promotion.end_time).toLocaleDateString('zh-CN')}`}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center mt-2 text-sm" style={{ color: getStockStatusColor(item) }}>
                            {isOutOfStock ? (
                              <span className="font-medium">
                                {i18n.language === 'ar' ? 'نفد المخزون' : i18n.language === 'en' ? 'Out of Stock' : '缺货'}
                              </span>
                            ) : isLowStock ? (
                              <span className="font-medium">
                                ⚠️ {getStockStatusText(item)} - {i18n.language === 'ar' ? `المخزون المتاح ${item.stock}` : i18n.language === 'en' ? `Only ${item.stock} left` : `仅剩 ${item.stock} 件`}
                              </span>
                            ) : (
                              <span>{getStockStatusText(item)}</span>
                            )}
                          </div>

                          <div className="flex items-center mt-3 sm:mt-4">
                            <div className="flex items-center border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                              <button
                                onClick={() => handleDecrement(item.id, localQuantities[item.id] ?? item.quantity)}
                                disabled={(localQuantities[item.id] ?? item.quantity) <= 1 || updatingId === item.id}
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-colors disabled:opacity-50"
                                style={{ color: 'var(--text)' }}
                              >
                                -
                              </button>
                              <span
                                className="w-10 sm:w-12 text-center font-medium"
                                style={{ color: 'var(--text)' }}
                              >
                                {updatingId === item.id ? '...' : (localQuantities[item.id] ?? item.quantity)}
                              </span>
                              <button
                                onClick={() => handleIncrement(item.id)}
                                disabled={updatingId === item.id}
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-colors disabled:opacity-50"
                                style={{ color: 'var(--text)' }}
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={removingId === item.id}
                              className="ml-4 p-2 rounded-lg transition-colors disabled:opacity-50"
                              style={{ color: 'var(--color-red)', background: 'transparent' }}
                            >
                              {removingId === item.id ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="hidden sm:block text-right ml-4">
                          <p className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
                            {formatCurrency(item.price * item.quantity, currency)}
                          </p>
                        </div>
                      </div>

                      <div className="sm:hidden mt-3 flex justify-between items-center">
                        <span className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
                          {formatCurrency(item.price * item.quantity, currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-lg sticky top-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--heading-font)' }}>
                  {i18n.language === 'ar' ? 'ملخص الطلب' : i18n.language === 'en' ? 'Order Summary' : '订单摘要'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>
                    {i18n.language === 'ar' ? 'المجموع الفرعي' : i18n.language === 'en' ? 'Subtotal' : '小计'}
                    <span className="text-sm ml-1">({selectedItems.length} {i18n.language === 'ar' ? 'منتج' : i18n.language === 'en' ? 'items' : '件'})</span>
                  </span>
                  <span style={{ color: 'var(--text)' }}>{formatCurrency(getSelectedTotal(), currency)}</span>
                </div>

                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>
                    {i18n.language === 'ar' ? 'الشحن' : i18n.language === 'en' ? 'Shipping' : '运费'}
                  </span>
                  <span style={{ color: 'var(--color-green)' }}>
                    {i18n.language === 'ar' ? 'مجاني' : i18n.language === 'en' ? 'Free' : '免费'}
                  </span>
                </div>

                <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="flex justify-between text-lg font-bold">
                    <span style={{ color: 'var(--text)' }}>
                      {i18n.language === 'ar' ? 'المجموع' : i18n.language === 'en' ? 'Total' : '合计'}
                    </span>
                    <span style={{ color: 'var(--primary)' }}>{formatCurrency(getSelectedTotal(), currency)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0}
                  className="w-full py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: selectedItems.length > 0 ? 'var(--btn-primary-bg)' : 'var(--border)',
                    color: selectedItems.length > 0 ? 'var(--btn-primary-text)' : 'var(--text-muted)',
                    border: selectedItems.length > 0 ? '1px solid var(--btn-primary-border)' : 'none'
                  }}
                >
                  {i18n.language === 'ar' ? 'إتمام الشراء' : i18n.language === 'en' ? 'Checkout' : '结 算'}
                </button>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {i18n.language === 'ar' ? 'دفع آمن' : i18n.language === 'en' ? 'Secure Payment' : '安全支付'}
                  </span>
                </div>

                <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={i18n.language === 'ar' ? 'كود الخصم' : i18n.language === 'en' ? 'Coupon Code' : '优惠券代码'}
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: 'var(--background)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)'
                      }}
                    />
                    <button
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{
                        background: 'transparent',
                        color: 'var(--primary)',
                        border: '1px solid var(--primary)'
                      }}
                    >
                      {i18n.language === 'ar' ? 'تطبيق' : i18n.language === 'en' ? 'Apply' : '应用'}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-sm mt-2" style={{ color: 'var(--color-red)' }}>{couponError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
