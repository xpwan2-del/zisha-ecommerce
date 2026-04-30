"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTheme } from '@/components/ThemeProvider';
import { formatMultiCurrency, formatMultiPriceSync } from '@/lib/utils/currency';
import Image from 'next/image';

interface ProductInfo {
  id: number;
  name: string;
  name_en?: string;
  image: string;
  price: number;
  original_price: number;
  discount_amount: number;
  currency: string;
  price_usd: number;
  price_cny?: number;
  price_aed?: number;
  original_price_usd?: number;
  stock: number;
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

interface PriceData {
  subtotal: number;
  original_subtotal: number;
  original_price: number;
  product_discount: number;
  coupon_discount: number;
  shipping_fee: number;
  total_aed: number;
  total_usd: number;
  total_cny: number;
  display_currency?: string;
  display_total?: number;
  address?: Address;
  coupon?: {
    ids: number[];
    discount: number;
    details: Array<{
      id: number;
      discount: number;
      code: string;
      type: 'percentage' | 'fixed';
      value: number;
    }>;
  };
  promotions: Array<{
    id: number;
    name: string;
    discount: number;
    percent: number;
  }>;
  payment_method?: string;
}

function QuickOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { themeColors } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [reservedStock, setReservedStock] = useState(0);

  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentOrderDbId, setCurrentOrderDbId] = useState<number | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [unavailableCoupons, setUnavailableCoupons] = useState<Coupon[]>([]);
  const [usedCoupons, setUsedCoupons] = useState<Coupon[]>([]);
  const [expiredCoupons, setExpiredCoupons] = useState<Coupon[]>([]);
  const [claimableCoupons, setClaimableCoupons] = useState<Coupon[]>([]);
  const [myCouponsTab, setMyCouponsTab] = useState<'available' | 'expired' | 'used' | 'claimable'>('available');
  const [selectedCouponIds, setSelectedCouponIds] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'alipay' | 'mock'>('paypal');
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('pending');

  useEffect(() => {
    if (!isAuthLoading && !user) {
      const productId = searchParams.get('product_id');
      router.push(`/login?redirect=/quick-order?product_id=${productId || ''}`);
      return;
    }
  }, [isAuthLoading, user, router, searchParams]);

  useEffect(() => {
    const fetchQuickOrderData = async () => {
      const orderId = searchParams.get('order_id');
      const orderNumber = searchParams.get('order_number');
      const productId = searchParams.get('product_id');
      const qty = parseInt(searchParams.get('quantity') || '1', 10);

      if (!orderId && !orderNumber && !productId) {
        setError('Order ID or Product ID is required');
        setIsLoading(false);
        return;
      }

      try {
        let url = '/api/quick-order?';
        const orderId = searchParams.get('order_id');
        const orderNumber = searchParams.get('order_number');
        const productId = searchParams.get('product_id');
        const qty = parseInt(searchParams.get('quantity') || '1', 10);

        if (!orderId && !orderNumber && !productId) {
          setError('Order ID or Product ID is required');
          setIsLoading(false);
          return;
        }

        if (orderId || orderNumber) {
          const orderNumberValue = orderNumber || orderId;
          setCurrentOrderId(orderNumberValue);
          url += `order_number=${orderNumberValue}`;
        } else if (productId) {
          const generatedOrderNumber = `PRODUCT_${productId}_${qty}`;
          setCurrentOrderId(generatedOrderNumber);
          url += `order_number=${generatedOrderNumber}`;
        }

        const response = await fetch(url, {
          credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setProduct(data.data.product);
          setQuantity(data.data.quantity);
          setCurrentOrderDbId(data.data.order_id);
          setAddresses(data.data.addresses);
          setAvailableCoupons(data.data.coupons?.available || []);
          setUnavailableCoupons(data.data.coupons?.unavailable || []);
          setUsedCoupons(data.data.coupons?.used || []);
          setExpiredCoupons(data.data.coupons?.expired || []);
          setClaimableCoupons(data.data.coupons?.claimable || []);
          setOrderStatus(data.data.order_status || 'pending');

          const defaultAddress = data.data.addresses.find((a: Address) => a.is_default === 1);
          if (defaultAddress) {
            setSelectedAddressId(defaultAddress.id);
          } else if (data.data.addresses.length > 0) {
            setSelectedAddressId(data.data.addresses[0].id);
          }

          if (data.data.subtotal !== undefined) {
            const d = data.data;
            setPriceData({
              original_subtotal: d.original_subtotal_usd ?? d.original_subtotal ?? d.original_price ?? 84.47,
              subtotal: d.subtotal_usd ?? d.subtotal ?? 59.13,
              original_price: d.original_price ?? 84.47,
              product_discount: d.discount_amount ?? d.product_discount ?? 25.34,
              coupon_discount: 0,
              shipping_fee: 0,
              total_usd: d.total_usd ?? d.subtotal_usd ?? 59.13,
              total_cny: d.price_cny ?? 652.1,
              total_aed: d.price_aed ?? 310,
              coupon: undefined,
              promotions: d.product_promotions || []
            });
          }
        } else {
          setError(data.error || 'Failed to load quick order data');
        }
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchQuickOrderData();
    }
  }, [user, searchParams]);

  useEffect(() => {
    const calculatePrice = async () => {
      if (!product || !selectedAddressId) return;

      setIsCalculating(true);
      try {
        const response = await fetch('/api/quick-order/calculate', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: product.id,
            quantity,
            address_id: selectedAddressId,
            coupon_ids: selectedCouponIds.length > 0 ? selectedCouponIds : undefined,
            payment_method: paymentMethod
          })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          const d = data.data;
          setPriceData({
            original_subtotal: d.original_subtotal_usd ?? d.original_subtotal ?? d.original_price ?? 84.47,
            subtotal: d.subtotal_usd ?? d.subtotal ?? 59.13,
            original_price: d.original_price ?? 84.47,
            product_discount: d.product_discount_usd ?? d.product_discount ?? 25.34,
            coupon_discount: d.coupon_discount_usd ?? d.coupon_discount ?? 0,
            shipping_fee: d.shipping_fee_usd ?? d.shipping_fee ?? 0,
            total_usd: d.total_usd ?? d.subtotal_usd ?? 59.13,
            total_cny: d.total_cny ?? d.price_cny ?? 652.1,
            total_aed: d.total_aed ?? d.price_aed ?? 310,
            coupon: d.coupon,
            promotions: d.product_promotions || []
          });
        }
      } catch (err) {
        console.error('Price calculation error:', err);
      } finally {
        setIsCalculating(false);
      }
    };

    const timer = setTimeout(() => {
      calculatePrice();
    }, 300);

    return () => clearTimeout(timer);
  }, [product, quantity, selectedAddressId, selectedCouponIds]);

  const handleIncrementStock = async () => {
    if (!product) return;
    const maxAllowed = product.stock - reservedStock;
    if (quantity >= maxAllowed) return;

    try {
      const response = await fetch('/api/quick-order/inventory', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          action: 'increment',
          quantity: 1
        })
      });

      const data = await response.json();
      if (data.success) {
        setQuantity(prev => prev + 1);
        setReservedStock(prev => prev + 1);
      }
    } catch (err) {
      console.error('Failed to increment stock:', err);
    }
  };

  const handleDecrementStock = async () => {
    if (!product || quantity <= 1) return;

    try {
      const response = await fetch('/api/quick-order/inventory', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          action: 'decrement',
          quantity: 1
        })
      });

      const data = await response.json();
      if (data.success) {
        setQuantity(prev => prev - 1);
        setReservedStock(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to decrement stock:', err);
    }
  };

  const handleCouponSelect = (coupon: Coupon) => {
    const isSelected = selectedCouponIds.includes(coupon.id);

    if (isSelected) {
      setSelectedCouponIds(prev => prev.filter(id => id !== coupon.id));
      return;
    }

    // Check if any non-stackable coupon is already selected
    const hasNonStackableSelected = selectedCouponIds.some(id => {
      const existingCoupon = availableCoupons.find(c => c.id === id);
      return existingCoupon && existingCoupon.is_stackable === 0;
    });

    // If a non-stackable coupon exists, don't allow adding stackable coupons
    if (hasNonStackableSelected) {
      return;
    }

    // If this coupon is non-stackable, replace all selections with it
    if (coupon.is_stackable === 0) {
      setSelectedCouponIds([coupon.id]);
      return;
    }

    // Add stackable coupon
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
        const orderId = searchParams.get('order_id');
        const productId = searchParams.get('product_id');
        const qty = parseInt(searchParams.get('quantity') || '1', 10);
        let url = '/api/quick-order?';
        if (orderId) {
          url += `order_id=${orderId}`;
        } else {
          url += `product_id=${productId}&quantity=${qty}`;
        }
        const dataResponse = await fetch(url, { credentials: 'include' });
        const data = await dataResponse.json();
        if (data.success) {
          setClaimableCoupons(data.data.coupons?.claimable || []);
          setAvailableCoupons(data.data.coupons?.available || []);
          setMyCouponsTab('available');
        }
      }
    } catch (err) {
      console.error('Failed to receive coupon:', err);
    }
  };

  const handleCreateOrder = async () => {
    console.log('=== handleCreateOrder called ===');
    console.log('product:', product?.id);
    console.log('selectedAddressId:', selectedAddressId);
    console.log('currentOrderId:', currentOrderId);
    console.log('currentOrderDbId:', currentOrderDbId);
    console.log('paymentMethod:', paymentMethod);

    if (!product || !selectedAddressId) {
      setError('请选择收货地址');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      if (!currentOrderId) {
        setError('订单信息加载中，请稍后');
        setIsCreating(false);
        return;
      }

      const order_number = currentOrderId;
      const dbOrderId = currentOrderDbId;

      if (!dbOrderId) {
        setError('订单不存在，请从商品详情页重新下单');
        setIsCreating(false);
        return;
      }

      const updateResponse = await fetch('/api/quick-order/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: dbOrderId,
          address_id: selectedAddressId,
          payment_method: paymentMethod,
          coupon_ids: selectedCouponIds.length > 0 ? selectedCouponIds : undefined,
          order_final_discount_amount: priceData ? (priceData.product_discount + priceData.coupon_discount) : 0
        })
      });

      console.log('updateResponse status:', updateResponse.status);

      const updateData = await updateResponse.json();

      console.log('updateData:', updateData);

      if (!updateResponse.ok || !updateData.success) {
        setError(updateData.error || '订单更新失败');
        setIsCreating(false);
        return;
      }

      if (paymentMethod === 'paypal') {
        const paypalResponse = await fetch('/api/payments/paypal', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_number: order_number,
            amount: (priceData?.total_usd ?? 0).toFixed(2) || '0',
            currency: 'USD',
            items: [{
              product_id: product.id,
              name: product.name,
              price: priceData ? (priceData.subtotal ?? priceData.total_usd ?? 0) / quantity : 0,
              quantity: quantity
            }]
          })
        });

        console.log('paypalResponse status:', paypalResponse.status);

        const paypalData = await paypalResponse.json();

        console.log('paypalData:', paypalData);

        // 统一响应格式：success + data.redirect_url
        if (paypalResponse.ok && paypalData.success && paypalData.data?.redirect_url) {
          window.location.href = paypalData.data.redirect_url;
        } else {
          setError(paypalData.message || paypalData.error || '支付失败，请稍后重试');
          setIsCreating(false);
        }
      } else {
        const alipayResponse = await fetch('/api/payments/alipay', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_number: order_number,
            amount: (priceData?.total_cny ?? 0).toFixed(2) || '0',
            currency: 'CNY'
          })
        });

        const alipayData = await alipayResponse.json();

        if (alipayResponse.ok && alipayData.success && alipayData.data.payment_url) {
          window.location.href = alipayData.data.payment_url;
        } else {
          setError(alipayData.message || alipayData.error || '支付失败，请稍后重试');
          setIsCreating(false);
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('支付失败，请稍后重试');
      setIsCreating(false);
    }
  };

  // 取消订单
  const handleCancelOrder = async () => {
    if (!confirm('确定要取消订单吗？')) return;
    if (!currentOrderDbId) {
      alert('订单信息加载中，请稍后');
      return;
    }

    try {
      const response = await fetch(`/api/orders/${currentOrderDbId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (response.ok) {
        router.push('/');
      } else {
        alert('取消失败，请重试');
      }
    } catch (err) {
      console.error('Cancel order error:', err);
      alert('取消失败，请重试');
    }
  };

  const formatPrice = (amount: any, currency: string, themeConfig?: any) => {
    if (amount === undefined || amount === null) return `${currency} 0.00`;
    const num = typeof amount === 'number' ? amount : (parseFloat(amount) || 0);
    const symbols: Record<string, string> = { USD: '$', CNY: '¥', AED: '' };
    return `${symbols[currency] || currency} ${num.toFixed(2)}`;
  };

  if (isAuthLoading || !user) {
    return (
      <div className="py-12 px-4 bg-[#FDF2F8] min-h-screen">
        <div className="max-w-4xl mx-auto flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#831843]"></div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-12 px-4 bg-[#FDF2F8] min-h-screen">
        <div className="max-w-4xl mx-auto flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#831843]"></div>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="py-12 px-4 bg-[#FDF2F8] min-h-screen">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center h-64">
          <p className="text-[#831843] mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-[#831843] text-white rounded-lg"
          >
            {t('common.back', '返回')}
          </button>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="py-12 px-4 bg-[var(--background)] min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center font-['Noto_Naskh_Arabic'] text-[var(--text)]">
          {t('quick_order.title', '快速下单')}
        </h1>

        {error && (
          <div className="mb-6 bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] p-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-[var(--card)]/80 rounded-lg shadow-md border border-[var(--border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold font-['Noto_Naskh_Arabic'] text-[var(--text)]">
                {t('quick_order.product', '商品信息')}
              </h2>
            </div>
            <div className="p-6">
              <div className="flex gap-4">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={product.image || '/placeholder.jpg'}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium font-['Noto_Naskh_Arabic'] text-[var(--text)]">{product.name}</h3>
                  {product.name_en && (
                    <p className="text-sm opacity-60">{product.name_en}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-lg font-bold text-[var(--accent)]">
                      {formatMultiPriceSync(product.price_usd ?? 0)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <label className="text-sm opacity-70 mb-1">{t('quick_order.quantity', '数量')}</label>
                  <div className="flex items-center border border-[var(--border)] rounded-lg">
                    <button
                      onClick={handleDecrementStock}
                      className="px-3 py-1 text-[var(--text)] hover:bg-[var(--accent)]/10"
                      disabled={quantity <= 1}
                    >
                      -
                    </button>
                    <span className="px-3 py-1 font-medium text-[var(--text)]">{quantity}</span>
                    <button
                      onClick={handleIncrementStock}
                      className="px-3 py-1 text-[var(--text)] hover:bg-[var(--accent)]/10"
                      disabled={quantity >= product.stock - reservedStock}
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs opacity-50 mt-1">
                    {t('quick_order.stock', '库存')} {product.stock - reservedStock}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--card)]/80 rounded-lg shadow-md border border-[var(--border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold font-['Noto_Naskh_Arabic'] text-[var(--text)]">
                {t('quick_order.shipping_address', '收货地址')}
              </h2>
            </div>
            <div className="p-6">
              {addresses.length === 0 ? (
                <div className="text-center py-4">
                  <p className="opacity-70 mb-4">{t('quick_order.no_address', '暂无收货地址')}</p>
                  <button
                    onClick={() => router.push('/addresses/new?redirect=/quick-order')}
                    className="px-4 py-2 text-white rounded-lg hover:opacity-90"
                    style={{
                      backgroundColor: 'var(--btn-primary-bg)',
                      color: 'var(--btn-primary-text)'
                    }}
                  >
                    {t('quick_order.add_address', '添加地址')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      onClick={() => setSelectedAddressId(address.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedAddressId === address.id
                          ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                          : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedAddressId === address.id
                            ? 'border-[var(--accent)] bg-[var(--accent)]'
                            : 'border-[var(--border)]'
                        }`}>
                          {selectedAddressId === address.id && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--text)]">{address.name}</span>
                            <span className="opacity-60">{address.phone}</span>
                            {address.is_default === 1 && (
                              <span className="text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-0.5 rounded">
                                {t('quick_order.default', '默认')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm opacity-70 mt-1">
                            {address.address}, {address.city}, {address.country}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[var(--card)]/80 rounded-lg shadow-md border border-[var(--border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold font-['Noto_Naskh_Arabic'] text-[var(--text)]">
                {t('quick_order.coupon', '优惠券')}
              </h2>
            </div>
            <div className="p-6">
              <div
                onClick={() => setSelectedCouponIds([])}
                className={`p-4 border rounded-lg transition-all mb-3 ${
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
                  <span className="text-[var(--text)]">{t('quick_order.no_coupon', '不使用优惠券')}</span>
                </div>
              </div>

              <div className="flex border-b mb-4" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setMyCouponsTab('available')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    myCouponsTab === 'available' ? 'border-[var(--accent)]' : 'border-transparent'
                  }`}
                  style={{ color: myCouponsTab === 'available' ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  可用 ({availableCoupons.length})
                </button>
                <button
                  onClick={() => setMyCouponsTab('expired')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    myCouponsTab === 'expired' ? 'border-[var(--accent)]' : 'border-transparent'
                  }`}
                  style={{ color: myCouponsTab === 'expired' ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  已过期 ({expiredCoupons.length})
                </button>
                <button
                  onClick={() => setMyCouponsTab('used')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    myCouponsTab === 'used' ? 'border-[var(--accent)]' : 'border-transparent'
                  }`}
                  style={{ color: myCouponsTab === 'used' ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  已使用 ({usedCoupons.length})
                </button>
                <button
                  onClick={() => setMyCouponsTab('claimable')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    myCouponsTab === 'claimable' ? 'border-[var(--accent)]' : 'border-transparent'
                  }`}
                  style={{ color: myCouponsTab === 'claimable' ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  未领取 ({claimableCoupons.length})
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {myCouponsTab === 'available' && (
                  availableCoupons.length === 0 ? (
                    <div className="col-span-2 rounded-lg border p-4 text-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
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
                    <div className="col-span-2 rounded-lg border p-4 text-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
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
                    <div className="col-span-2 rounded-lg border p-4 text-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
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
                    <div className="col-span-2 rounded-lg border p-4 text-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
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
                        : formatPrice(coupon.value ?? 0, 'USD');

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
                            <span className="font-medium text-[var(--text)]">{discountText}</span>
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
              <h2 className="text-lg font-semibold font-['Noto_Naskh_Arabic'] text-[var(--text)]">
                {t('quick_order.payment_method', '支付方式')}
              </h2>
            </div>
            <div className="p-6 space-y-3">
              <div
                onClick={() => setPaymentMethod('paypal')}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'paypal'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'paypal'
                      ? 'border-[var(--accent)] bg-[var(--accent)]'
                      : 'border-[var(--border)]'
                  }`}>
                    {paymentMethod === 'paypal' && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <svg className="w-10 h-6 text-[#012169]" viewBox="0 0 24 16" fill="currentColor">
                    <path d="M7.402 0H1.512C.675 0 0 .675 0 1.512v12.976C0 15.325.675 16 1.512 16h11.89c.837 0 1.512-.675 1.512-1.512V8.73l-2.27-2.27c-.337-.337-.836-.337-1.173 0L8.465 9.54c.162.162.387.243.621.243.234 0 .459-.081.621-.243l.675-.675a.828.828 0 000-1.173L8.307 6.11a.828.828 0 00-1.173 0L5.07 8.175c-.162.162-.387.243-.621.243-.234 0-.459-.081-.621-.243L2.756 7.092a.828.828 0 000-1.173L4.83 4.008c.337-.337.836-.337 1.173 0l1.401 1.401c.337.337.836.337 1.173 0l1.719-1.72a.828.828 0 000-1.173L7.402 0z"/>
                  </svg>
                  <div className="flex-1">
                    <span className="font-medium text-[var(--text)]">PayPal</span>
                    <span className="text-sm opacity-60 ml-2">({t('quick_order.usd_payment', '美元支付')})</span>
                  </div>
                  {priceData && (
                    <span className="font-bold text-[var(--accent)]">
                      ${(priceData.total_usd ?? 0).toFixed(2)} USD
                    </span>
                  )}
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod('alipay')}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'alipay'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'alipay'
                      ? 'border-[var(--accent)] bg-[var(--accent)]'
                      : 'border-[var(--border)]'
                  }`}>
                    {paymentMethod === 'alipay' && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="w-10 h-6 bg-[#1677FF] rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">支</span>
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-[var(--text)]">{t('quick_order.alipay', '支付宝')}</span>
                    <span className="text-sm opacity-60 ml-2">({t('quick_order.cny_payment', '人民币支付')})</span>
                  </div>
                  {priceData && (
                    <span className="font-bold text-[var(--accent)]">
                      ¥{(priceData.total_cny ?? 0).toFixed(2)} CNY
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {priceData && (
            <div className="bg-[var(--card)]/80 rounded-lg shadow-md border border-[var(--border)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <h2 className="text-lg font-semibold font-['Noto_Naskh_Arabic'] text-[var(--text)]">
                  {t('quick_order.price_details', '价格明细')}
                </h2>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="opacity-70">{t('quick_order.original_price', '商品总价')}</span>
                  <span className="line-through opacity-50">{formatMultiPriceSync(priceData.original_subtotal ?? priceData.original_price ?? 0)}</span>
                </div>
                {priceData.product_discount > 0 && (
                  <>
                    {priceData.promotions && priceData.promotions.length > 0 ? (
                      priceData.promotions.map((promo: any, idx: number) => (
                        <div key={idx}>
                          <div className="flex justify-between text-sm items-center">
                            <span className="opacity-70 flex items-center gap-2">
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">{promo.name}</span>
                              <span className="text-green-600">-{promo.percent}%</span>
                            </span>
                            <span className="text-green-600">-{formatMultiPriceSync(promo.discount)}</span>
                          </div>
                          <div className="text-xs text-green-600 pl-4 opacity-70">
                              = {formatMultiPriceSync(priceData.original_subtotal ?? 0)} × {promo.percent}%
                            </div>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="opacity-70">{t('quick_order.promotion_discount', '促销优惠')}</span>
                          <span className="text-green-600">-{formatMultiPriceSync(priceData.product_discount ?? 0)}</span>
                        </div>
                        <div className="text-xs text-green-600 pl-4 opacity-70">
                          = {formatMultiPriceSync(priceData.original_subtotal ?? 0)} - {formatMultiPriceSync(priceData.product_discount ?? 0)}
                        </div>
                      </>
                    )}
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="opacity-70">{t('quick_order.after_promotion', '促销后小计')}</span>
                  <span>{formatMultiPriceSync(priceData.subtotal ?? priceData.total_usd ?? 0)}</span>
                </div>
                {priceData.coupon_discount > 0 && (
                  <>
                    <div className="pt-2 border-t border-dashed border-[var(--border)]"></div>
                    {(() => {
                      let remaining = priceData.subtotal ?? priceData.total_usd ?? 0;
                      const details = priceData.coupon?.details || [];
                      return details.map((detail: any, idx: number) => {
                        const prevRemaining = remaining;
                        remaining = remaining - (detail.discount ?? 0);
                        
                        let formula = '';
                        if (detail.type === 'percentage') {
                          formula = `= ${formatMultiPriceSync(prevRemaining)} × ${detail.value}%`;
                        } else {
                          formula = `= ${formatMultiPriceSync(prevRemaining)} - ${formatMultiPriceSync(detail.discount ?? 0)}`;
                        }
                        
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-sm text-green-600">
                              <span>
                                {detail.code || `券${detail.id}`}
                                {detail.type === 'percentage' ? ` (${detail.value}%)` : ` (固定${detail.value})`}
                              </span>
                              <span>-{formatMultiPriceSync(detail.discount ?? 0)}</span>
                            </div>
                            <div className="text-xs text-green-600 pl-4 opacity-70">
                              {formula}
                            </div>
                          </div>
                        );
                      });
                    })()}
                    <div className="pt-2 border-t border-dashed border-[var(--border)]"></div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t('quick_order.coupon_discount', '优惠券优惠')}</span>
                      <span>-{formatMultiPriceSync(priceData.coupon_discount ?? 0)}</span>
                    </div>
                    <div className="text-xs text-green-600 pl-4 opacity-70">
                      = {formatMultiPriceSync(priceData.subtotal ?? 0)} - {formatMultiPriceSync(priceData.coupon_discount ?? 0)}
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="opacity-70">{t('quick_order.after_coupon', '券后小计')}</span>
                  <span>{formatMultiPriceSync((priceData.subtotal ?? 0) - (priceData.coupon_discount ?? 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-70">{t('quick_order.shipping_fee', '运费')}</span>
                  <span>
                    {(priceData.shipping_fee ?? 0) > 0 ? formatMultiPriceSync(priceData.shipping_fee) : t('quick_order.free', '免费')}
                  </span>
                </div>
                <div className="pt-3 border-t border-[var(--border)]">
                  <div className="flex justify-between">
                    <span className="font-medium">{t('quick_order.total', '合计')}</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-[var(--accent)]">
                        {formatMultiPriceSync(priceData.total_usd ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleCreateOrder}
            disabled={!selectedAddressId || isCreating || isCalculating}
            className="w-full py-4 rounded-lg font-medium text-lg transition-all hover:opacity-90 disabled:opacity-50 font-['Noto_Sans_Arabic']"
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: '1px solid var(--btn-primary-border)'
            }}
          >
            {isCreating ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {t('quick_order.creating', '正在创建订单...')}
              </div>
            ) : (
              t('quick_order.place_order', '提交订单') + (priceData ? ` (${paymentMethod === 'paypal' ? `$${(priceData.total_usd ?? 0).toFixed(2)} USD` : `¥${(priceData.total_cny ?? 0).toFixed(2)} CNY`})` : '')
            )}
          </button>
          
          <button
            type="button"
            onClick={handleCancelOrder}
            className="w-full mt-3 py-3 text-gray-500 hover:text-red-600 transition-colors text-sm"
          >
            {t('quick_order.cancel_order', '取消订单')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuickOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <QuickOrderContent />
    </Suspense>
  );
}
