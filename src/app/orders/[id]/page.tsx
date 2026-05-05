'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { formatMultiPriceSync, getCountdown } from '@/lib/utils/currency';

interface OrderDetailItem {
  id: number;
  product_id: number;
  product_name: string;
  product_name_en?: string;
  product_image: string;
  quantity: number;
  original_price: number;
  subtotal?: number;  // 后端返回的小计（折扣前）
  total_promotions_discount_amount: number;
}

interface PaymentLogEntry {
  id: number;
  transaction_id: string;
  amount: number;
  status: string;
  error_code: string;
  error_message: string;
  is_success: boolean;
  created_at: string;
}

interface OrderCoupon {
  order_coupon_id: number;
  coupon_id: number;
  coupon_code: string;
  coupon_name: string;
  coupon_type: string;
  coupon_value: number;
  discount_applied: number;
}

interface OrderDetail {
  id: number;
  order_number: string;
  order_status: string;
  payment_status: string;
  payment_method: string;
  total_original_price: number;
  total_after_promotions_amount: number;
  order_final_discount_amount: number;
  total_coupon_discount: number;
  shipping_fee: number;
  final_amount: number;
  created_at: string;
  updated_at: string;
  address_name: string;
  address_phone: string;
  address_detail: string;
  items: OrderDetailItem[];
  coupons?: OrderCoupon[];
  selected_coupon_ids?: number[];
  payment_logs: PaymentLogEntry[];
}

interface Address {
  id: number;
  contact_name: string;
  phone: string;
  street_address: string;
  city: string;
  country_name: string;
  is_default: number;
}

interface CouponItem {
  id: number;
  coupon_id: number;
  code: string;
  name: string;
  type: string;
  value: number;
  is_stackable: number;
  description: string;
  expires_at: string;
  status: string;
}

const formatPrice = (amount: number) => {
  return `$${Number(amount).toFixed(2)} / ¥${(Number(amount) * 7.19).toFixed(2)} / AED${(Number(amount) / 0.2722).toFixed(2)}`;
};

const statusLabels: Record<string, { zh: string; color: string }> = {
  pending: { zh: '待支付', color: 'bg-yellow-100 text-yellow-800' },
  paid: { zh: '已支付', color: 'bg-green-100 text-green-800' },
  cancelled: { zh: '已取消', color: 'bg-red-100 text-red-800' },
  shipped: { zh: '已发货', color: 'bg-blue-100 text-blue-800' },
  delivered: { zh: '已签收', color: 'bg-purple-100 text-purple-800' },
  refunding: { zh: '退款中', color: 'bg-orange-100 text-orange-800' },
  refunded: { zh: '已退款', color: 'bg-gray-100 text-gray-800' },
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'paypal' | 'alipay' | 'stripe'>('paypal');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<CouponItem[]>([]);
  const [expiredCoupons, setExpiredCoupons] = useState<CouponItem[]>([]);
  const [usedCoupons, setUsedCoupons] = useState<CouponItem[]>([]);
  const [claimableCoupons, setClaimableCoupons] = useState<CouponItem[]>([]);
  const [couponTab, setCouponTab] = useState<'available' | 'expired' | 'used' | 'claimable'>('available');
  const [selectedCouponIds, setSelectedCouponIds] = useState<number[]>([]);
  const [estimatedPrice, setEstimatedPrice] = useState<{
    subtotal: number;
    original_total: number;
    product_discount: number;
    coupon_discount: number;
    shipping_fee: number;
    final_amount: number;
  } | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [countdown, setCountdown] = useState<ReturnType<typeof getCountdown> | null>(null);

  const getUserId = () => Number(user?.id) || 0;

  const hasUnstackableSelected = () => {
    return selectedCouponIds.some((id) => {
      const c = availableCoupons.find((c) => c.id === id);
      return c && c.is_stackable === 0;
    });
  };

  const isCouponSelectable = (coupon: CouponItem) => {
    if (selectedCouponIds.includes(coupon.id)) return true;
    if (selectedCouponIds.length === 0) return true;
    if (coupon.is_stackable === 0) return false;
    if (hasUnstackableSelected()) return false;
    return true;
  };

  const fetchOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setOrder(data.data);
        setSelectedCouponIds(data.data.selected_coupon_ids || []);
      } else {
        setError(data.error || '订单不存在');
      }
    } catch {
      setError('加载订单失败');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (order && order.order_status === 'pending' && order.created_at) {
      const tick = () => setCountdown(getCountdown(order.created_at));
      tick();
      const timer = setInterval(tick, 1000);
      return () => clearInterval(timer);
    } else {
      setCountdown(null);
    }
  }, [order?.order_status, order?.created_at]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/orders/${orderId}`);
      return;
    }
    fetchOrder();
    fetchAddresses();
    fetchCoupons();
  }, [orderId, user, authLoading, router, fetchOrder]);

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/addresses', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data) {
        const addrList: Address[] = Array.isArray(data.data) ? data.data : data.data.addresses || [];
        setAddresses(addrList);
        const defaultAddr = addrList.find((a: Address) => a.is_default === 1) || addrList[0];
        if (defaultAddr && !selectedAddressId) {
          setSelectedAddressId(defaultAddr.id);
        }
      }
    } catch { /* ignore */ }
  };

  const fetchCoupons = async () => {
    setIsLoadingCoupons(true);
    const uid = getUserId();
    if (!uid) { setIsLoadingCoupons(false); return; }
    try {
      const [activeRes, expiredRes, usedRes, claimableRes] = await Promise.all([
        fetch(`/api/coupons?status=active&limit=100`, { headers: { 'x-user-id': String(uid) } }),
        fetch(`/api/coupons?status=expired&limit=100`, { headers: { 'x-user-id': String(uid) } }),
        fetch(`/api/coupons?status=used&limit=100`, { headers: { 'x-user-id': String(uid) } }),
        fetch(`/api/coupons?status=available&limit=100`, { headers: { 'x-user-id': String(uid) } })
      ]);
      const [activeData, expiredData, usedData, claimableData] = await Promise.all([
        activeRes.json(), expiredRes.json(), usedRes.json(), claimableRes.json()
      ]);
      const mapCoupon = (uc: any, status: string): CouponItem => ({
        id: uc.id, coupon_id: uc.coupon_id || 0, code: uc.code, name: uc.name,
        type: uc.type, value: uc.value, is_stackable: uc.is_stackable || 0,
        description: uc.description || '', expires_at: uc.expires_at || '',
        status
      });
      const mappedUsedCoupons = (usedData.data?.user_coupons || []).map((uc: any) => mapCoupon(uc, 'used'));
      const selectedOrderCoupons = (order?.coupons || [])
        .filter((coupon) => !mappedUsedCoupons.some((usedCoupon: CouponItem) => usedCoupon.id === coupon.coupon_id))
        .map((coupon) => ({
          id: coupon.coupon_id,
          coupon_id: coupon.coupon_id,
          code: coupon.coupon_code,
          name: coupon.coupon_name,
          type: coupon.coupon_type,
          value: coupon.coupon_value,
          is_stackable: selectedCouponIds.length > 1 ? 1 : 0,
          description: '',
          expires_at: '',
          status: 'used'
        }));
      setAvailableCoupons((activeData.data?.user_coupons || []).map((uc: any) => mapCoupon(uc, 'active')));
      setExpiredCoupons((expiredData.data?.user_coupons || []).map((uc: any) => mapCoupon(uc, 'expired')));
      setUsedCoupons([...mappedUsedCoupons, ...selectedOrderCoupons]);
      setClaimableCoupons((claimableData.data?.available_coupons || []).map((c: any) => ({
        id: 0, coupon_id: c.id, code: c.code, name: c.name, type: c.type, value: c.value,
        is_stackable: c.is_stackable || 0, description: c.description || '',
        expires_at: c.end_date || c.expires_at || '', status: 'claimable'
      })));
    } catch { /* ignore */ }
    setIsLoadingCoupons(false);
  };

  const handleCouponSelect = (coupon: CouponItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedCouponIds.includes(coupon.id)) {
      setSelectedCouponIds(selectedCouponIds.filter((id) => id !== coupon.id));
    } else {
      if (coupon.is_stackable === 0 && selectedCouponIds.length > 0) return;
      if (hasUnstackableSelected()) return;
      setSelectedCouponIds([...selectedCouponIds, coupon.id]);
    }
  };

  const handleReceiveCoupon = async (coupon: CouponItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': String(getUserId()) },
        body: JSON.stringify({ coupon_id: coupon.coupon_id })
      });
      const data = await res.json();
      if (data.success) {
        fetchCoupons();
      } else {
        alert(data.error || '领取失败');
      }
    } catch { alert('领取请求失败'); }
  };

  const fetchEstimate = useCallback(async () => {
    if (!order || !selectedAddressId) return;
    setIsEstimating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          address_id: selectedAddressId,
          coupon_ids: selectedCouponIds
        })
      });
      const data = await res.json();
      if (data.success) {
        setEstimatedPrice(data.data);
      }
    } catch (err) {
      console.error('Estimate failed:', err);
    } finally {
      setIsEstimating(false);
    }
  }, [order, selectedAddressId, selectedCouponIds]);

  useEffect(() => {
    if (order && order.order_status === 'pending' && selectedAddressId) {
      fetchEstimate();
    }
  }, [selectedAddressId, selectedCouponIds, fetchEstimate]);

  useEffect(() => {
    if (order) {
      fetchCoupons();
    }
  }, [order?.id, order?.coupons]);

  const handleAddressChange = (addressId: number) => {
    setSelectedAddressId(addressId);
    fetchCoupons();
    setSelectedCouponIds([]);
  };

  const handleSubmit = async () => {
    if (!order) return;
    if (!selectedAddressId) {
      alert('请选择收货地址');
      return;
    }
    setIsPaying(true);

    try {
      const prepRes = await fetch(`/api/orders/${order.id}/prepare-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          address_id: selectedAddressId,
          payment_method: selectedPayment,
          coupon_ids: selectedCouponIds
        })
      });
      const prepData = await prepRes.json();

      if (!prepData.success) {
        alert(prepData.error || '订单更新失败');
        setIsPaying(false);
        return;
      }

      const paymentData = {
        amount: prepData.data.final_amount,
        currency: 'USD',
        order_number: order.order_number,
        order_id: order.id,
        source: 're-pay',
        items: prepData.data.items
      };

      const res = await fetch(`/api/payments/${selectedPayment}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(paymentData),
      });
      const data = await res.json();

      if (data.success) {
        if (selectedPayment === 'paypal' && data.data?.redirect_url) {
          window.location.href = data.data.redirect_url;
        } else if (selectedPayment === 'alipay' && data.data?.payment_url) {
          window.location.href = data.data.payment_url;
        } else if (selectedPayment === 'stripe' && data.data?.redirect_url) {
          window.location.href = data.data.redirect_url;
        }
      } else {
        alert(data.error || '支付创建失败');
      }
    } catch {
      alert('支付请求失败');
    } finally {
      setIsPaying(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    if (!confirm('确定要取消这个订单吗？取消后库存和优惠券将自动归还。')) return;

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();

      if (data.success) {
        fetchOrder();
      } else {
        alert(data.error || '取消失败');
      }
    } catch {
      alert('取消请求失败');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center">
        <p className="text-[var(--text-muted)] mb-4">{error || '订单不存在'}</p>
        <button onClick={() => router.push('/account?tab=orders')}
          className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg">
          返回订单列表
        </button>
      </div>
    );
  }

  const statusInfo = statusLabels[order.order_status] || { zh: order.order_status, color: 'bg-gray-100 text-gray-800' };
  const isPending = order.order_status === 'pending';

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => router.back()} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-2 cursor-pointer">
              ← 返回
            </button>
            <h1 className="text-2xl font-bold text-[var(--text)]">订单详情</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.zh}
            </span>
            {isPending && countdown && countdown.urgency !== 'expired' && (
              <span className={`text-sm font-mono font-bold ${
                countdown.urgency === 'critical' ? 'text-red-600 animate-pulse' :
                countdown.urgency === 'warning' ? 'text-orange-500' :
                'text-amber-500'
              }`}>
                ⏱ {countdown.display}
              </span>
            )}
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">订单信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-[var(--text-muted)]">订单号：</span><span className="font-mono">{order.order_number}</span></div>
            <div><span className="text-[var(--text-muted)]">支付方式：</span>{order.payment_method?.toUpperCase() || '—'}</div>
            <div><span className="text-[var(--text-muted)]">下单时间：</span>{order.created_at ? new Date(order.created_at).toLocaleString('zh-CN') : '—'}</div>
            <div><span className="text-[var(--text-muted)]">更新时间：</span>{order.updated_at ? new Date(order.updated_at).toLocaleString('zh-CN') : '—'}</div>
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">收货地址</h2>
          {isPending && addresses.length > 0 ? (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => handleAddressChange(addr.id)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedAddressId === addr.id
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-[var(--text)]">{addr.contact_name}</span>
                      <span className="text-[var(--text-muted)] ml-2">{addr.phone}</span>
                      {addr.is_default === 1 && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-[var(--accent)]/10 text-[var(--accent)]">默认</span>
                      )}
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedAddressId === addr.id ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border)]'
                    }`}>
                      {selectedAddressId === addr.id && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{addr.street_address}, {addr.city}, {addr.country_name}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[var(--text)]">
              <p className="font-medium">{order.address_name} <span className="text-[var(--text-muted)] ml-2">{order.address_phone}</span></p>
              <p className="text-[var(--text-muted)] mt-1">{order.address_detail}</p>
            </div>
          )}
        </div>

        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">商品信息</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 py-3 border-b border-[var(--border)] last:border-0">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {item.product_image ? (
                    <Image src={item.product_image} alt={item.product_name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🏺</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.product_id}`} className="font-medium text-[var(--text)] hover:text-[var(--accent)]">
                    {item.product_name}
                  </Link>
                  {item.product_name_en && <p className="text-xs text-[var(--text-muted)]">{item.product_name_en}</p>}
                  <p className="text-sm text-[var(--text-muted)] mt-1">x{item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-[var(--text)]">{formatPrice(item.subtotal ?? (item.original_price * item.quantity))}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--border)] space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">商品原价</span>
              <span className="text-[var(--text)]">{formatPrice(estimatedPrice?.original_total ?? order.total_original_price)}</span>
            </div>
            {(estimatedPrice?.product_discount ?? order.order_final_discount_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">促销折扣</span>
                <span className="text-green-600">-{formatPrice(estimatedPrice?.product_discount ?? order.order_final_discount_amount)}</span>
              </div>
            )}
            {(estimatedPrice?.coupon_discount ?? order.total_coupon_discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">优惠券</span>
                <span className="text-green-600">-{formatPrice(estimatedPrice?.coupon_discount ?? order.total_coupon_discount)}</span>
              </div>
            )}
            {!!order.coupons?.length && (
              <div className="pt-1">
                <div className="text-[var(--text-muted)] mb-1">已占用优惠券</div>
                <div className="flex flex-wrap gap-2">
                  {order.coupons.map((coupon) => (
                    <span
                      key={coupon.order_coupon_id}
                      className="px-2 py-1 rounded-full text-xs bg-[var(--accent)]/10 text-[var(--accent)]"
                    >
                      {coupon.coupon_name}（{coupon.coupon_code}）
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">运费</span>
              <span className="text-[var(--text)]">
                {estimatedPrice?.shipping_fee !== undefined 
                  ? (estimatedPrice.shipping_fee > 0 ? formatPrice(estimatedPrice.shipping_fee) : '免运费')
                  : (order.shipping_fee > 0 ? formatPrice(order.shipping_fee) : '免运费')
                }
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[var(--border)] font-bold text-lg">
              <span>应付总额</span>
              <span className="text-[var(--accent)]">
                {isEstimating ? (
                  <span className="opacity-50">计算中...</span>
                ) : (
                  formatPrice(estimatedPrice?.final_amount ?? order.final_amount)
                )}
              </span>
            </div>
          </div>
        </div>

        {order.payment_logs && order.payment_logs.length > 0 && (
          <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">支付记录</h2>
            <div className="space-y-3">
              {order.payment_logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 text-sm">
                  <div className="flex items-center gap-3">
                    <span className={log.is_success ? 'text-green-500' : 'text-red-500'}>
                      {log.is_success ? '✅' : '❌'}
                    </span>
                    <span className="text-[var(--text)]">{log.status}</span>
                    {log.error_message && (
                      <span className="text-red-500 text-xs">{log.error_message}</span>
                    )}
                  </div>
                  <div className="text-[var(--text-muted)] text-xs">
                    {log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isPending && (
          <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">优惠券</h2>
            {isLoadingCoupons ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--accent)]"></div>
                <span className="ml-2 text-sm text-[var(--text-muted)]">加载中...</span>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-4 border-b border-[var(--border)]">
                  {(['available', 'expired', 'used', 'claimable'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setCouponTab(tab)}
                      className={`pb-2 px-3 text-sm cursor-pointer transition-colors border-b-2 ${
                        couponTab === tab
                          ? 'border-[var(--accent)] text-[var(--accent)] font-medium'
                          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      {tab === 'available' && `可用 (${availableCoupons.length})`}
                      {tab === 'expired' && `已过期 (${expiredCoupons.length})`}
                      {tab === 'used' && `已使用 (${usedCoupons.length})`}
                      {tab === 'claimable' && `未领取 (${claimableCoupons.length})`}
                    </button>
                  ))}
                </div>

                {couponTab === 'available' && (
                  <>
                    {selectedCouponIds.length > 0 && (
                      <div
                        onClick={() => setSelectedCouponIds([])}
                        className="p-2 text-sm text-[var(--text-muted)] cursor-pointer hover:text-red-500 transition-colors"
                      >
                        不使用优惠券
                      </div>
                    )}
                    {availableCoupons.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)] py-4 text-center">暂无可用优惠券</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {availableCoupons.map((c) => {
                          const isSelected = selectedCouponIds.includes(c.id);
                          const selectable = isCouponSelectable(c);
                          const isDisabled = !selectable;
                          const discountText = c.type === 'percentage'
                            ? `${c.value}%`
                            : `${c.value}`;
                          const daysLeft = Math.max(0, Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                          return (
                            <div
                              key={c.id}
                              onClick={(e) => !isDisabled && handleCouponSelect(c, e)}
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
                                  <span className="text-white text-[10px] font-bold text-center leading-tight">{c.name}</span>
                                  <span className="text-white/80 text-[10px] mt-1 bg-white/20 px-1 py-0.5 rounded">
                                    {c.is_stackable === 1 ? '可叠加' : '不可叠加'}
                                  </span>
                                </div>
                                <div className="flex-1 p-2">
                                  <div className="flex justify-between items-start mb-1">
                                    <div>
                                      <span className="text-[var(--accent)] font-bold">{discountText}</span>
                                      <p className="text-[10px] text-[var(--text-muted)]">{c.code}</p>
                                    </div>
                                    {isSelected && (
                                      <span className="bg-green-500 text-white text-[10px] px-1 py-0.5 rounded">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] mb-1 text-[var(--text)] truncate">{c.description}</p>
                                  <div className="flex flex-wrap gap-1 text-[10px]">
                                    <span className="bg-gray-100 px-1 py-0.5 rounded text-[var(--text-muted)]">
                                      剩{daysLeft}天
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {couponTab === 'expired' && (
                  <div className="space-y-2">
                    {expiredCoupons.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)] py-4 text-center">暂无已过期优惠券</p>
                    ) : (
                      expiredCoupons.map((c) => (
                        <div key={c.id} className="p-3 border border-[var(--border)] rounded-lg opacity-50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[var(--text)]">{c.name}</span>
                            <span className="text-xs text-red-400">已过期</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {couponTab === 'used' && (
                  <div className="space-y-2">
                    {usedCoupons.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)] py-4 text-center">暂无已使用优惠券</p>
                    ) : (
                      usedCoupons.map((c) => (
                        <div key={c.id} className="p-3 border border-[var(--border)] rounded-lg opacity-50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[var(--text)]">{c.name}</span>
                            <span className="text-xs text-[var(--text-muted)]">已使用</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {couponTab === 'claimable' && (
                  <div className="space-y-2">
                    {claimableCoupons.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)] py-4 text-center">暂无未领取的优惠券</p>
                    ) : (
                      claimableCoupons.map((c) => (
                        <div key={c.coupon_id} className="p-3 border border-[var(--border)] rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-[var(--text)]">{c.name}</span>
                              <span className="text-xs text-[var(--text-muted)] ml-2">{c.code}</span>
                            </div>
                            <button
                              onClick={(e) => handleReceiveCoupon(c, e)}
                              className="px-3 py-1 text-xs rounded cursor-pointer transition-colors"
                              style={{ background: 'var(--accent)', color: '#fff' }}
                            >
                              领取
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {isPending && (
          <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">支付方式</h2>
            <div className="space-y-3">
              <div
                onClick={() => setSelectedPayment('paypal')}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedPayment === 'paypal'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPayment === 'paypal'
                      ? 'border-[var(--accent)] bg-[var(--accent)]'
                      : 'border-[var(--border)]'
                  }`}>
                    {selectedPayment === 'paypal' && (
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
                    <span className="text-sm opacity-60 ml-2">(美元支付)</span>
                  </div>
                  <span className="font-bold text-[var(--accent)]">
                    ${Number(estimatedPrice?.final_amount ?? order.final_amount).toFixed(2)} USD
                  </span>
                </div>
              </div>

              <div
                onClick={() => setSelectedPayment('alipay')}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedPayment === 'alipay'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPayment === 'alipay'
                      ? 'border-[var(--accent)] bg-[var(--accent)]'
                      : 'border-[var(--border)]'
                  }`}>
                    {selectedPayment === 'alipay' && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="w-10 h-6 bg-[#1677FF] rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">支</span>
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-[var(--text)]">支付宝</span>
                    <span className="text-sm opacity-60 ml-2">(人民币支付)</span>
                  </div>
                  <span className="font-bold text-[var(--accent)]">
                    ¥{Number((estimatedPrice?.final_amount ?? order.final_amount) * 7.19).toFixed(2)} CNY
                  </span>
                </div>
              </div>

              <div
                onClick={() => setSelectedPayment('stripe')}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedPayment === 'stripe'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPayment === 'stripe'
                      ? 'border-[var(--accent)] bg-[var(--accent)]'
                      : 'border-[var(--border)]'
                  }`}>
                    {selectedPayment === 'stripe' && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="w-10 h-6 bg-[#635BFF] rounded flex items-center justify-center">
                    <span className="text-white font-bold text-[10px]">S</span>
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-[var(--text)]">Stripe</span>
                    <span className="text-sm opacity-60 ml-2">(美元支付)</span>
                  </div>
                  <span className="font-bold text-[var(--accent)]">
                    ${Number(estimatedPrice?.final_amount ?? order.final_amount).toFixed(2)} USD
                  </span>
                </div>
              </div>
            </div>

        {isPending && estimatedPrice && (
          <div className="bg-[var(--card)]/80 rounded-lg shadow-md border border-[var(--border)] overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--text)]">
                价格明细
              </h2>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="opacity-70">商品总价</span>
                <span className="line-through opacity-50">
                  {formatMultiPriceSync(estimatedPrice.original_total ?? order.total_original_price)}
                </span>
              </div>
              {estimatedPrice.product_discount > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">促销优惠</span>
                    <span className="text-green-600">
                      -{formatMultiPriceSync(estimatedPrice.product_discount)}
                    </span>
                  </div>
                  <div className="text-xs text-green-600 pl-4 opacity-70">
                    = {formatMultiPriceSync(estimatedPrice.original_total ?? 0)} - {formatMultiPriceSync(estimatedPrice.product_discount)}
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="opacity-70">促销后小计</span>
                <span>{formatMultiPriceSync(estimatedPrice.subtotal)}</span>
              </div>
              {(estimatedPrice.coupon_discount ?? 0) > 0 && (
                <>
                  <div className="pt-2 border-t border-dashed border-[var(--border)]"></div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>优惠券优惠</span>
                    <span>-{formatMultiPriceSync(estimatedPrice.coupon_discount)}</span>
                  </div>
                  <div className="text-xs text-green-600 pl-4 opacity-70">
                    = {formatMultiPriceSync(estimatedPrice.subtotal)} - {formatMultiPriceSync(estimatedPrice.coupon_discount)}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">券后小计</span>
                    <span>{formatMultiPriceSync(estimatedPrice.subtotal - (estimatedPrice.coupon_discount ?? 0))}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="opacity-70">运费</span>
                <span>
                  {(estimatedPrice.shipping_fee ?? 0) > 0
                    ? formatMultiPriceSync(estimatedPrice.shipping_fee ?? 0)
                    : '免费'}
                </span>
              </div>
              <div className="pt-3 border-t border-[var(--border)]">
                <div className="flex justify-between">
                  <span className="font-medium">合计</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-[var(--accent)]">
                      {formatMultiPriceSync(estimatedPrice.final_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

            <div className="mt-6">
              <button
                onClick={handleSubmit}
                disabled={isPaying}
                className="w-full py-4 rounded-lg font-medium text-lg transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                  border: '1px solid var(--btn-primary-border)'
                }}
              >
                {isPaying ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    正在跳转...
                  </div>
                ) : (
                  `提交订单 (${selectedPayment === 'alipay'
                    ? `¥${Number((estimatedPrice?.final_amount ?? order.final_amount) * 7.19).toFixed(2)} CNY`
                    : `$${Number(estimatedPrice?.final_amount ?? order.final_amount).toFixed(2)} USD`
                  })`
                )}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="w-full mt-3 py-3 text-gray-500 hover:text-red-600 transition-colors text-sm cursor-pointer"
              >
                {isCancelling ? '取消中...' : '取消订单'}
              </button>
            </div>
          </div>
        )}

        {order.order_status === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium mb-2">订单已取消</p>
            <p className="text-sm text-red-500">库存和优惠券已自动归还</p>
          </div>
        )}

        <div className="flex gap-4">
          <button onClick={() => router.push('/account?tab=orders')}
            className="flex-1 py-3 border-2 border-[var(--border)] text-[var(--text)] rounded-lg font-medium hover:bg-[var(--background-alt)] cursor-pointer">
            返回订单列表
          </button>
          <button onClick={() => router.push('/')}
            className="flex-1 py-3 border-2 border-[var(--border)] text-[var(--text)] rounded-lg font-medium hover:bg-[var(--background-alt)] cursor-pointer">
            继续购物
          </button>
        </div>
      </div>
    </div>
  );
}
