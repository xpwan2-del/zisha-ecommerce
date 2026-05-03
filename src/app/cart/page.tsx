"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCart } from '@/lib/contexts/CartContext';
import { formatMultiPriceSync } from '@/lib/utils/currency';
import { getDisplayPromotions } from '@/lib/pricing/promotionDisplay';
import Image from 'next/image';

interface CartItem {
  id: number;
  product_id: number;
  name: string;
  name_en?: string;
  name_ar?: string;
  price: number;
  original_price?: number;
  price_usd?: number;
  price_cny?: number;
  price_aed?: number;
  final_price_usd?: number;
  final_price_cny?: number;
  final_price_aed?: number;
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
  total_usd?: number;
  total_cny?: number;
  total_aed?: number;
  total_items: number;
}

interface StockStatusInfo {
  id: number;
  name: string;
  name_en: string;
  name_ar: string;
}

interface Coupon {
  id: number;
  coupon_id: number;
  code: string;
  name: string;
  type: string;
  discount_type: string;
  value: number;
  description: string;
  expires_at: string;
  is_stackable: number;
}

interface Address {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  is_default: number;
}

interface PaymentMethod {
  code: string;
  name: string;
  isSandbox: boolean;
  isEnabled: boolean;
}

export default function CartPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { refreshCart } = useCart();

  const [cartData, setCartData] = useState<CartData>({ items: [], total: 0, total_items: 0 });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const isFetchingCart = useRef(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [unavailableCoupons, setUnavailableCoupons] = useState<Coupon[]>([]);
  const [usedCoupons, setUsedCoupons] = useState<Coupon[]>([]);
  const [expiredCoupons, setExpiredCoupons] = useState<Coupon[]>([]);
  const [claimableCoupons, setClaimableCoupons] = useState<Coupon[]>([]);
  const [myCouponsTab, setMyCouponsTab] = useState<'available' | 'expired' | 'used' | 'claimable'>('available');
  const [selectedCouponIds, setSelectedCouponIds] = useState<number[]>([]);
  const [couponDiscountUsd, setCouponDiscountUsd] = useState(0);
  const [couponDiscountCny, setCouponDiscountCny] = useState(0);
  const [couponDiscountAed, setCouponDiscountAed] = useState(0);
  const [totalAfterCouponUsd, setTotalAfterCouponUsd] = useState(0);
  const [totalAfterCouponCny, setTotalAfterCouponCny] = useState(0);
  const [totalAfterCouponAed, setTotalAfterCouponAed] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isCalculatingCoupons, setIsCalculatingCoupons] = useState(false);

  const fetchCartData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cart', {
        credentials: 'include',
        headers: {
          'x-lang': i18n.language
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCartData(data.data || { items: [], total: 0, total_items: 0 });
        if (data.data?.items) {
          setSelectedItems(data.data.items.map((item: CartItem) => item.id));
        }
        if (data.data?.coupons) {
          setAvailableCoupons(data.data.coupons.available || []);
          setUnavailableCoupons(data.data.coupons.unavailable || []);
          setUsedCoupons(data.data.coupons.used || []);
          setExpiredCoupons(data.data.coupons.expired || []);
          setClaimableCoupons(data.data.coupons.claimable || []);
        }
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchCartData();
    } else if (!authLoading && !isAuthenticated) {
      setCartData({ items: [], total: 0, total_items: 0 });
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  const fetchAddresses = async () => {
    if (!isAuthenticated) return;
    setIsLoadingAddresses(true);
    try {
      const response = await fetch('/api/addresses', { credentials: 'include' });
      const data = await response.json();
      if (response.ok && data.success) {
        const mapped: Address[] = (data.data || []).map((a: any) => ({
          id: a.id,
          name: a.contact_name,
          phone: a.phone,
          address: [a.street_address, a.street_address_2].filter(Boolean).join(' '),
          city: a.city,
          country: a.country_name,
          is_default: a.is_default ? 1 : 0
        }));
        setAddresses(mapped);

        if (mapped.length > 0 && selectedAddressId == null) {
          const def = mapped.find(x => x.is_default === 1) || mapped[0];
          setSelectedAddressId(def.id);
        }
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [isAuthenticated]);

  const fetchPaymentMethods = async () => {
    setIsLoadingPaymentMethods(true);
    try {
      const response = await fetch('/api/payments/methods', { credentials: 'include' });
      const data = await response.json();
      if (response.ok && data.success) {
        const enabled = (data.data || []).filter((m: any) => m.isEnabled);
        setPaymentMethods(enabled);
        if (enabled.length > 0 && !selectedPaymentMethod) {
          setSelectedPaymentMethod(enabled[0].code);
        }
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

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

  const getSelectedTotals = (): { usd: number; cny: number; aed: number } => {
    const selected = cartData.items.filter(item => selectedItems.includes(item.id));
    const usd = selected.reduce((sum, item) => sum + (item.final_price_usd ?? item.price) * item.quantity, 0);
    const cny = selected.reduce((sum, item) => sum + (item.final_price_cny ?? item.price_cny ?? 0) * item.quantity, 0);
    const aed = selected.reduce((sum, item) => sum + (item.final_price_aed ?? item.price_aed ?? 0) * item.quantity, 0);
    return { usd, cny, aed };
  };

  const getSelectedPromotionsDiscount = (): { usd: number; cny: number; aed: number; totalPercent: number } => {
    const selected = cartData.items.filter(item => selectedItems.includes(item.id));
    let usd = 0;
    let cny = 0;
    let aed = 0;
    let totalPercent = 0;

    for (const item of selected) {
      if (item.promotion && item.total_discount_percent && item.total_discount_percent > 0) {
        const originalUsd = (item.original_price ?? item.price_usd ?? item.price) * item.quantity;
        const discountUsd = originalUsd * (item.total_discount_percent / 100);
        usd += discountUsd;
        totalPercent = Math.max(totalPercent, item.total_discount_percent);

        if (item.price_cny) {
          const originalCny = item.price_cny * item.quantity;
          cny += originalCny * (item.total_discount_percent / 100);
        }
        if (item.price_aed) {
          const originalAed = item.price_aed * item.quantity;
          aed += originalAed * (item.total_discount_percent / 100);
        }
      }
    }

    return { usd: Math.round(usd * 100) / 100, cny: Math.round(cny * 100) / 100, aed: Math.round(aed * 100) / 100, totalPercent };
  };

  const getSelectedOriginalTotal = (): { usd: number; cny: number; aed: number } => {
    const selected = cartData.items.filter(item => selectedItems.includes(item.id));
    const usd = selected.reduce((sum, item) => sum + (item.original_price ?? item.price_usd ?? item.price) * item.quantity, 0);
    const cny = selected.reduce((sum, item) => sum + (item.price_cny ?? 0) * item.quantity, 0);
    const aed = selected.reduce((sum, item) => sum + (item.price_aed ?? 0) * item.quantity, 0);
    return { usd, cny, aed };
  };

  const handleCouponSelect = (coupon: Coupon) => {
    const isSelected = selectedCouponIds.includes(coupon.id);

    if (isSelected) {
      setSelectedCouponIds(prev => prev.filter(id => id !== coupon.id));
      return;
    }

    const hasNonStackableSelected = selectedCouponIds.some(id => {
      const existingCoupon = availableCoupons.find(c => c.id === id);
      return existingCoupon && existingCoupon.is_stackable === 0;
    });

    if (hasNonStackableSelected) {
      return;
    }

    if (coupon.is_stackable === 0) {
      setSelectedCouponIds([coupon.id]);
      return;
    }

    setSelectedCouponIds(prev => [...prev, coupon.id]);
  };

  const handleReceiveCoupon = async (couponId: number) => {
    if (!user) return;
    try {
      const response = await fetch('/api/coupons', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id)
        },
        body: JSON.stringify({ coupon_id: couponId })
      });

      if (response.ok) {
        await fetchCartData();
        setMyCouponsTab('available');
      }
    } catch (err) {
      console.error('Failed to receive coupon:', err);
    }
  };

  useEffect(() => {
    const calculateCoupons = async () => {
      const totals = getSelectedTotals();
      if (selectedCouponIds.length === 0 || selectedItems.length === 0) {
        setCouponDiscountUsd(0);
        setCouponDiscountCny(0);
        setCouponDiscountAed(0);
        setTotalAfterCouponUsd(totals.usd);
        setTotalAfterCouponCny(totals.cny);
        setTotalAfterCouponAed(totals.aed);
        return;
      }

      setIsCalculatingCoupons(true);
      try {
        const response = await fetch('/api/cart/coupons/calculate', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coupon_ids: selectedCouponIds,
            subtotal_usd: totals.usd,
            subtotal_cny: totals.cny,
            subtotal_aed: totals.aed
          })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setCouponDiscountUsd(data.data.coupon_discount_usd || 0);
          setCouponDiscountCny(data.data.coupon_discount_cny || 0);
          setCouponDiscountAed(data.data.coupon_discount_aed || 0);
          setTotalAfterCouponUsd(data.data.total_usd ?? totals.usd);
          setTotalAfterCouponCny(data.data.total_cny ?? totals.cny);
          setTotalAfterCouponAed(data.data.total_aed ?? totals.aed);
        }
      } catch (err) {
        console.error('Failed to calculate coupons:', err);
      } finally {
        setIsCalculatingCoupons(false);
      }
    };

    calculateCoupons();
  }, [selectedCouponIds, selectedItems, cartData.items]);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/cart');
      return;
    }

    if (selectedItems.length === 0) {
      alert(i18n.language === 'ar' ? 'الرجاء تحديد منتج واحد على الأقل' : i18n.language === 'en' ? 'Please select at least one product' : '请至少选择一个商品');
      return;
    }

    if (!selectedAddressId) {
      alert(i18n.language === 'ar' ? 'يرجى اختيار عنوان الشحن' : i18n.language === 'en' ? 'Please select a shipping address' : '请选择收货地址');
      return;
    }

    if (!selectedPaymentMethod) {
      alert(i18n.language === 'ar' ? 'يرجى اختيار طريقة الدفع' : i18n.language === 'en' ? 'Please select a payment method' : '请选择支付方式');
      return;
    }

    setIsSubmitting(true);
    try {
      const createOrder = async (cartItemIds: number[]) => {
        const resp = await fetch('/api/cart/create-order', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-lang': i18n.language },
          body: JSON.stringify({
            cart_item_ids: cartItemIds,
            address_id: selectedAddressId,
            coupon_ids: selectedCouponIds,
            payment_method: selectedPaymentMethod
          })
        });
        const data = await resp.json();
        return { resp, data };
      };

      let { resp: createResp, data: createData } = await createOrder(selectedItems);

      if (!createResp.ok || !createData.success) {
        if (createData?.error === 'Cart items not found' || createData?.error === 'Some cart items not found') {
          const cartResp = await fetch('/api/cart', { credentials: 'include', headers: { 'x-lang': i18n.language } });
          if (cartResp.ok) {
            const cartJson = await cartResp.json();
            const freshIds = (cartJson.data?.items || []).map((it: any) => it.id);
            setSelectedItems(freshIds);
            if (freshIds.length > 0) {
              ({ resp: createResp, data: createData } = await createOrder(freshIds));
            }
          }
        }
      }

      if (!createResp.ok || !createData.success) {
        alert(createData.message || createData.error || '创建订单失败');
        return;
      }

      const { order_id, order_number, amount_usd, amount_cny, amount_aed, items } = createData.data;
      setSelectedItems([]);
      setSelectedCouponIds([]);
      fetchCartData();

      if (selectedPaymentMethod === 'paypal') {
        const paypalResp = await fetch('/api/payments/paypal', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-lang': i18n.language },
          body: JSON.stringify({
            order_number,
            amount: Number(amount_usd || 0).toFixed(2),
            currency: 'USD',
            source: 'cart',
            items: (items || []).map((it: any) => ({
              product_id: it.product_id,
              name: it.name,
              image: it.image,
              price: it.price_usd ?? it.price,
              quantity: it.quantity
            }))
          })
        });

        const paypalData = await paypalResp.json();
        if (paypalResp.ok && paypalData.success && paypalData.data?.redirect_url) {
          window.location.href = paypalData.data.redirect_url;
          return;
        }

        alert(paypalData.message || paypalData.error || '支付失败，请稍后重试');
        return;
      }

      if (selectedPaymentMethod === 'alipay') {
        const alipayResp = await fetch('/api/payments/alipay', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id,
            order_number,
            amount: Number(amount_cny || 0).toFixed(2),
            currency: 'CNY',
            source: 'cart'
          })
        });

        const alipayData = await alipayResp.json();
        if (alipayResp.ok && alipayData.success && alipayData.data?.payment_url) {
          window.location.href = alipayData.data.payment_url;
          return;
        }

        alert(alipayData.message || alipayData.error || '支付失败，请稍后重试');
        return;
      }

      if (selectedPaymentMethod === 'stripe') {
        const stripeResp = await fetch('/api/payments/stripe', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_number,
            amount: Number(amount_aed || 0).toFixed(2),
            currency: 'aed',
            source: 'cart',
            items: (items || []).map((it: any) => ({
              product_id: it.product_id,
              name: it.name,
              image: it.image,
              price: it.price_aed ?? it.price,
              quantity: it.quantity
            }))
          })
        });

        const stripeData = await stripeResp.json();
        if (stripeResp.ok && stripeData.success && stripeData.data?.redirect_url) {
          window.location.href = stripeData.data.redirect_url;
          return;
        }

        alert(stripeData.message || stripeData.error || '支付失败，请稍后重试');
        return;
      }

      alert('不支持的支付方式');
    } catch (e) {
      console.error('Checkout error:', e);
      alert('创建订单失败');
    } finally {
      setIsSubmitting(false);
      await fetchCartData();
      refreshCart();
    }
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

        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-[var(--card)]/80 rounded-lg shadow-md border border-[var(--border)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
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
                            {formatMultiPriceSync(item.final_price_usd ?? item.price_usd ?? item.price)}
                          </span>
                        </div>

                        {item.promotion && !item.promotion.is_expired && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {item.total_discount_percent && item.total_discount_percent > 0 && (
                              <span className="px-2 py-1 rounded-md shadow-md font-bold text-white text-[10px] sm:text-xs" style={{ background: 'linear-gradient(135deg, #EF4444, rgba(239, 68, 68, 0.6))', boxShadow: 'rgba(0, 0, 0, 0.2) 0px 2px 4px' }}>
                                最终折扣 {item.total_discount_percent}% OFF SALE
                              </span>
                            )}
                            {getDisplayPromotions(item.promotions || [], item.promotion).map((promo: any) => {
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
                          {formatMultiPriceSync((item.final_price_usd ?? item.price_usd ?? item.price) * item.quantity)}
                        </p>
                      </div>
                    </div>

                    <div className="sm:hidden mt-3 flex justify-between items-center">
                      <span className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
                        {formatMultiPriceSync((item.final_price_usd ?? item.price_usd ?? item.price) * item.quantity)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[var(--card)]/80 rounded-lg shadow-md border border-[var(--border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--text)]" style={{ fontFamily: 'var(--heading-font)' }}>
                {i18n.language === 'ar' ? 'عنوان الشحن' : i18n.language === 'en' ? 'Shipping Address' : '收货地址'}
              </h2>
            </div>
            <div className="p-6 space-y-3">
              {isLoadingAddresses ? (
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>...</div>
              ) : addresses.length === 0 ? (
                <button
                  onClick={() => router.push('/addresses/new?redirect=/cart')}
                  className="w-full py-3 rounded-lg font-medium transition-all hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    border: '1px solid var(--btn-primary-border)'
                  }}
                >
                  {i18n.language === 'ar' ? 'إضافة عنوان' : i18n.language === 'en' ? 'Add Address' : '添加收货地址'}
                </button>
              ) : (
                addresses.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAddressId(a.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedAddressId === a.id
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedAddressId === a.id
                          ? 'border-[var(--accent)] bg-[var(--accent)]'
                          : 'border-[var(--border)]'
                      }`}>
                        {selectedAddressId === a.id && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--text)]">{a.name}</span>
                          <span className="text-sm opacity-60 text-[var(--text)]">{a.phone}</span>
                          {a.is_default === 1 && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">默认</span>
                          )}
                        </div>
                        <div className="text-sm opacity-70 text-[var(--text)]">
                          {a.address}，{a.city}，{a.country}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[var(--card)]/80 rounded-lg shadow-md border border-[var(--border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--text)]" style={{ fontFamily: 'var(--heading-font)' }}>
                {i18n.language === 'ar' ? 'قسائم' : i18n.language === 'en' ? 'Coupons' : '优惠券'}
              </h2>
            </div>
            <div className="p-6">
              <div
                onClick={() => setSelectedCouponIds([])}
                className={`p-3 border rounded-lg transition-all mb-3 ${
                  selectedCouponIds.length === 0
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5 cursor-pointer'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/40 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedCouponIds.length === 0
                      ? 'border-[var(--accent)] bg-[var(--accent)]'
                      : 'border-[var(--border)]'
                  }`}>
                    {selectedCouponIds.length === 0 && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[var(--text)]">{i18n.language === 'ar' ? 'بدون قسيمة' : i18n.language === 'en' ? 'No coupon' : '不使用优惠券'}</span>
                </div>
              </div>

              <div className="flex border-b mb-4" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setMyCouponsTab('available')}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    myCouponsTab === 'available' ? 'border-[var(--accent)]' : 'border-transparent'
                  }`}
                  style={{ color: myCouponsTab === 'available' ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  可用 ({availableCoupons.length})
                </button>
                <button
                  onClick={() => setMyCouponsTab('expired')}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    myCouponsTab === 'expired' ? 'border-[var(--accent)]' : 'border-transparent'
                  }`}
                  style={{ color: myCouponsTab === 'expired' ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  已过期 ({expiredCoupons.length})
                </button>
                <button
                  onClick={() => setMyCouponsTab('used')}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    myCouponsTab === 'used' ? 'border-[var(--accent)]' : 'border-transparent'
                  }`}
                  style={{ color: myCouponsTab === 'used' ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  已使用 ({usedCoupons.length})
                </button>
                <button
                  onClick={() => setMyCouponsTab('claimable')}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    myCouponsTab === 'claimable' ? 'border-[var(--accent)]' : 'border-transparent'
                  }`}
                  style={{ color: myCouponsTab === 'claimable' ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  未领取 ({claimableCoupons.length})
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {myCouponsTab === 'available' && (
                  availableCoupons.length === 0 ? (
                    <div className="rounded-lg border p-4 text-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                      <p style={{ color: 'var(--text-muted)' }}>暂无可用优惠券</p>
                    </div>
                  ) : (
                    availableCoupons.map((coupon) => {
                      const isSelected = selectedCouponIds.includes(coupon.id);
                      const hasNonStackableSelected = selectedCouponIds.some(id => {
                        const c = availableCoupons.find(ac => ac.id === id);
                        return c && c.is_stackable === 0;
                      });
                      const hasStackableSelected = selectedCouponIds.some(id => {
                        const c = availableCoupons.find(ac => ac.id === id);
                        return c && c.is_stackable === 1;
                      });
                      const isDisabled = !isSelected && (coupon.is_stackable === 0 ? hasStackableSelected || hasNonStackableSelected : hasNonStackableSelected);

                      const discountText = coupon.discount_type === 'percentage'
                        ? `${coupon.value}%`
                        : `${coupon.value}`;

                      const daysLeft = Math.max(0, Math.ceil((new Date(coupon.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                      return (
                        <div
                          key={coupon.id}
                          onClick={() => !isDisabled && handleCouponSelect(coupon)}
                          style={{ backgroundColor: 'var(--card)' }}
                          className={`rounded-lg overflow-hidden transition-all duration-200 cursor-pointer border ${
                            isSelected
                              ? 'border-[var(--accent)] shadow-lg'
                              : isDisabled
                              ? 'border-[var(--border)] opacity-50 cursor-not-allowed'
                              : 'border-[var(--border)] hover:border-[var(--accent)]/40 shadow-md'
                          }`}
                        >
                          <div className="flex h-full">
                            <div className={`w-[120px] shrink-0 p-2 flex flex-col items-center justify-center ${
                              isSelected
                                ? 'bg-gradient-to-br from-accent to-accent-hover'
                                : 'bg-gradient-to-br from-accent to-accent'
                            }`}>
                              <span className="text-white text-[10px] font-bold text-center leading-tight">{coupon.name}</span>
                              <span className="text-white/80 text-[10px] mt-1 bg-white/20 px-1 py-0.5 rounded">
                                {coupon.is_stackable === 1 ? '可叠加' : '不可叠加'}
                              </span>
                            </div>
                            <div className="flex-1 p-2">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <span className="text-[var(--accent)] font-bold">{discountText}</span>
                                  <p className="text-[10px] text-[var(--text-muted)]">{coupon.code}</p>
                                </div>
                                {isSelected && (
                                  <span className="bg-green-500 text-white text-[10px] px-1 py-0.5 rounded">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] mb-1 text-[var(--text)] truncate">{coupon.description}</p>
                              <div className="flex flex-wrap gap-1 text-[10px]">
                                <span className="bg-gray-100 px-1 py-0.5 rounded text-[var(--text-muted)]">
                                  剩{daysLeft}天
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {myCouponsTab === 'expired' && (
                  expiredCoupons.length === 0 ? (
                    <div className="rounded-lg border p-4 text-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                      <p style={{ color: 'var(--text-muted)' }}>无已过期优惠券</p>
                    </div>
                  ) : (
                    expiredCoupons.map((coupon) => {
                      const discountText = coupon.discount_type === 'percentage'
                        ? `${coupon.value}%`
                        : `${coupon.value}`;

                      return (
                        <div
                          key={coupon.id}
                          className="rounded-lg overflow-hidden border border-[var(--border)] bg-gray-50 opacity-60"
                        >
                          <div className="flex h-full">
                            <div className="w-[120px] shrink-0 p-2 flex flex-col items-center justify-center bg-gradient-to-br from-gray-400 to-gray-500">
                              <span className="text-white text-[10px] font-bold text-center leading-tight">已过期</span>
                              <span className="text-white/80 text-[10px] mt-1 bg-white/20 px-1 py-0.5 rounded">
                                {coupon.name}
                              </span>
                            </div>
                            <div className="flex-1 p-2">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <span className="text-gray-500 font-bold">{discountText}</span>
                                  <p className="text-[10px] text-[var(--text-muted)]">{coupon.code}</p>
                                </div>
                              </div>
                              <p className="text-[10px] mb-1 text-[var(--text)] truncate">{coupon.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {myCouponsTab === 'used' && (
                  usedCoupons.length === 0 ? (
                    <div className="rounded-lg border p-4 text-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                      <p style={{ color: 'var(--text-muted)' }}>无已使用优惠券</p>
                    </div>
                  ) : (
                    usedCoupons.map((coupon) => {
                      const discountText = coupon.discount_type === 'percentage'
                        ? `${coupon.value}%`
                        : `${coupon.value}`;

                      return (
                        <div
                          key={coupon.id}
                          className="rounded-lg overflow-hidden border border-[var(--border)] bg-gray-50 opacity-60"
                        >
                          <div className="flex h-full">
                            <div className="w-[120px] shrink-0 p-2 flex flex-col items-center justify-center bg-gradient-to-br from-gray-400 to-gray-500">
                              <span className="text-white text-[10px] font-bold text-center leading-tight">已使用</span>
                              <span className="text-white/80 text-[10px] mt-1 bg-white/20 px-1 py-0.5 rounded">
                                {coupon.name}
                              </span>
                            </div>
                            <div className="flex-1 p-2">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <span className="text-gray-500 font-bold">{discountText}</span>
                                  <p className="text-[10px] text-[var(--text-muted)]">{coupon.code}</p>
                                </div>
                              </div>
                              <p className="text-[10px] mb-1 text-[var(--text)] truncate">{coupon.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {myCouponsTab === 'claimable' && (
                  claimableCoupons.length === 0 ? (
                    <div className="rounded-lg border p-4 text-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                      <p style={{ color: 'var(--text-muted)' }}>无可领取优惠券</p>
                    </div>
                  ) : (
                    claimableCoupons.map((coupon) => {
                      const discountText = coupon.discount_type === 'percentage'
                        ? `${coupon.value}%`
                        : `${coupon.value}`;

                      return (
                        <div
                          key={coupon.coupon_id}
                          className="rounded-lg overflow-hidden border border-[var(--border)] bg-green-50"
                        >
                          <div className="flex h-full">
                            <div className="w-[120px] shrink-0 p-2 flex flex-col items-center justify-center bg-gradient-to-br from-green-500 to-green-600">
                              <span className="text-white text-[10px] font-bold text-center leading-tight">待领取</span>
                              <span className="text-white/80 text-[10px] mt-1 bg-white/20 px-1 py-0.5 rounded">
                                {coupon.name}
                              </span>
                            </div>
                            <div className="flex-1 p-2">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <span className="text-green-600 font-bold">{discountText}</span>
                                  <p className="text-[10px] text-[var(--text-muted)]">{coupon.code}</p>
                                </div>
                              </div>
                              <p className="text-[10px] mb-1 text-[var(--text)] truncate">{coupon.description}</p>
                              <button
                                onClick={() => handleReceiveCoupon(coupon.coupon_id)}
                                className="px-2 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white rounded text-[10px] font-medium hover:from-green-600 hover:to-green-700 transition-all cursor-pointer"
                              >
                                领取
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>

              {unavailableCoupons.length > 0 && myCouponsTab === 'available' && (
                <div className="space-y-3 mt-4 opacity-60">
                  <h3 className="text-sm font-medium opacity-70">{t('quick_order.unavailable_coupons', '不可用优惠券')}</h3>
                  {unavailableCoupons.map((coupon) => {
                    const discountText = coupon.discount_type === 'percentage'
                      ? `${coupon.value}%`
                      : `${coupon.value}`;

                    return (
                      <div
                        key={coupon.id}
                        className="p-4 border border-[var(--border)] rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center bg-gray-200">
                            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[var(--accent)]">{discountText}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[var(--card)]/80 rounded-lg shadow-md border border-[var(--border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--text)]" style={{ fontFamily: 'var(--heading-font)' }}>
                {i18n.language === 'ar' ? 'طريقة الدفع' : i18n.language === 'en' ? 'Payment Method' : '支付方式'}
              </h2>
            </div>
            <div className="p-6 space-y-3">
              {isLoadingPaymentMethods ? (
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>...</div>
              ) : paymentMethods.length === 0 ? (
                <div className="rounded-lg border p-4 text-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                  <p style={{ color: 'var(--text-muted)' }}>暂无可用支付方式</p>
                </div>
              ) : (
                paymentMethods.map((m) => (
                  <div
                    key={m.code}
                    onClick={() => setSelectedPaymentMethod(m.code)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedPaymentMethod === m.code
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPaymentMethod === m.code
                          ? 'border-[var(--accent)] bg-[var(--accent)]'
                          : 'border-[var(--border)]'
                      }`}>
                        {selectedPaymentMethod === m.code && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-[var(--text)]">{m.name}</span>
                        <span className="text-sm opacity-60 ml-2 text-[var(--text)]">({m.code})</span>
                        {m.isSandbox && (
                          <span className="text-[10px] ml-2 px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">Sandbox</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[var(--card)]/80 rounded-lg shadow-md border border-[var(--border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--text)]" style={{ fontFamily: 'var(--heading-font)' }}>
                {i18n.language === 'ar' ? 'تفاصيل الطلب' : i18n.language === 'en' ? 'Order Summary' : '结算明细'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {(() => {
                const promoDiscount = getSelectedPromotionsDiscount();
                const originalTotal = getSelectedOriginalTotal();
                const hasPromotions = promoDiscount.totalPercent > 0;
                return (
                  <>
                    {hasPromotions && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          {i18n.language === 'ar' ? 'السعر الأصلي' : i18n.language === 'en' ? 'Original Price' : '原价'}
                        </span>
                        <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                          {formatMultiPriceSync(originalTotal.usd)}
                        </span>
                      </div>
                    )}

                    {hasPromotions && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--color-green)' }}>
                          {i18n.language === 'ar' ? 'خصم العرض' : i18n.language === 'en' ? 'Promotion Discount' : '促销活动'}
                          <span className="text-xs ml-1" style={{ color: 'var(--color-green)' }}>
                            ({promoDiscount.totalPercent}% OFF)
                          </span>
                        </span>
                        <span style={{ color: 'var(--color-green)' }}>
                          -{formatMultiPriceSync(promoDiscount.usd)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>
                        {i18n.language === 'ar' ? 'المجموع الفرعي' : i18n.language === 'en' ? 'Subtotal' : '小计'}
                        <span className="text-sm ml-1">({selectedItems.length} {i18n.language === 'ar' ? 'منتج' : i18n.language === 'en' ? 'items' : '件'})</span>
                      </span>
                      <span style={{ color: 'var(--text)' }}>{formatMultiPriceSync(getSelectedTotals().usd)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>
                        {i18n.language === 'ar' ? 'الشحن' : i18n.language === 'en' ? 'Shipping' : '运费'}
                      </span>
                      <span style={{ color: 'var(--color-green)' }}>
                        {i18n.language === 'ar' ? 'مجاني' : i18n.language === 'en' ? 'Free' : '免费'}
                      </span>
                    </div>

                    {selectedCouponIds.length > 0 && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          {i18n.language === 'ar' ? 'خصم القسيمة' : i18n.language === 'en' ? 'Coupon Discount' : '优惠券优惠'}
                          <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                            ({selectedCouponIds.length})
                          </span>
                        </span>
                        <span style={{ color: couponDiscountUsd > 0 ? 'var(--color-green)' : 'var(--text)' }}>
                          {isCalculatingCoupons ? '...' : `-${formatMultiPriceSync(couponDiscountUsd)}`}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex justify-between text-lg font-bold">
                  <span style={{ color: 'var(--text)' }}>
                    {i18n.language === 'ar' ? 'المجموع' : i18n.language === 'en' ? 'Total' : '合计'}
                  </span>
                  <span style={{ color: 'var(--primary)' }}>{formatMultiPriceSync(totalAfterCouponUsd)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--card)]/80 rounded-lg shadow-md border border-[var(--border)] overflow-hidden">
            <div className="p-6 space-y-3">
              <button
                onClick={handleCheckout}
                disabled={selectedItems.length === 0 || selectedAddressId == null || selectedPaymentMethod == null || isSubmitting}
                className="w-full py-4 rounded-lg font-medium text-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                  border: '1px solid var(--btn-primary-border)'
                }}
              >
                {isSubmitting ? '...' : (i18n.language === 'ar' ? 'إتمام الشراء' : i18n.language === 'en' ? 'Place Order' : '提交订单')}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full py-3 transition-colors text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                {i18n.language === 'ar' ? 'رجوع' : i18n.language === 'en' ? 'Back' : '取消'}
              </button>
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {i18n.language === 'ar' ? 'دفع آمن' : i18n.language === 'en' ? 'Secure Payment' : '安全支付'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
