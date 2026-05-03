'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';

interface OrderDetailItem {
  id: number;
  product_id: number;
  product_name: string;
  product_name_en?: string;
  product_image: string;
  quantity: number;
  original_price: number;
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
  payment_logs: PaymentLogEntry[];
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

  const fetchOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setOrder(data.data);
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
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/orders/${orderId}`);
      return;
    }
    fetchOrder();
  }, [orderId, user, authLoading, router, fetchOrder]);

  const handleRepay = async () => {
    if (!order) return;
    setIsPaying(true);

    try {
      const paymentData = {
        amount: order.final_amount,
        currency: 'USD',
        order_number: order.order_number,
        order_id: order.id,
        source: 're-pay',
        items: order.items.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          unit_amount: item.original_price,
        })),
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
    if (!confirm('确定要取消这个订单吗？取消后库存将自动归还。')) return;

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
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.zh}
          </span>
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
          <div className="text-sm text-[var(--text)]">
            <p className="font-medium">{order.address_name} <span className="text-[var(--text-muted)] ml-2">{order.address_phone}</span></p>
            <p className="text-[var(--text-muted)] mt-1">{order.address_detail}</p>
          </div>
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
                  <p className="font-medium text-[var(--text)]">{formatPrice(item.original_price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--border)] space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">商品原价</span>
              <span className="text-[var(--text)]">{formatPrice(order.total_original_price)}</span>
            </div>
            {order.order_final_discount_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">促销折扣</span>
                <span className="text-green-600">-{formatPrice(order.order_final_discount_amount)}</span>
              </div>
            )}
            {order.total_coupon_discount > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">优惠券</span>
                <span className="text-green-600">-{formatPrice(order.total_coupon_discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">运费</span>
              <span className="text-[var(--text)]">{order.shipping_fee > 0 ? formatPrice(order.shipping_fee) : '免运费'}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[var(--border)] font-bold text-lg">
              <span>应付总额</span>
              <span className="text-[var(--accent)]">{formatPrice(order.final_amount)}</span>
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
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">选择支付方式</h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={() => setSelectedPayment('paypal')}
                className={`py-3 px-4 rounded-lg border-2 font-medium transition-all cursor-pointer ${
                  selectedPayment === 'paypal'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                }`}
              >
                PayPal
              </button>
              <button
                onClick={() => setSelectedPayment('alipay')}
                className={`py-3 px-4 rounded-lg border-2 font-medium transition-all cursor-pointer ${
                  selectedPayment === 'alipay'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                }`}
              >
                Alipay
              </button>
              <button
                onClick={() => setSelectedPayment('stripe')}
                className={`py-3 px-4 rounded-lg border-2 font-medium transition-all cursor-pointer ${
                  selectedPayment === 'stripe'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                }`}
              >
                Stripe
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRepay}
                disabled={isPaying}
                className="flex-1 py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {isPaying ? '正在跳转...' : `💳 使用 ${selectedPayment.toUpperCase()} 支付`}
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="px-6 py-3 border-2 border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 cursor-pointer"
              >
                {isCancelling ? '取消中...' : '取消订单'}
              </button>
            </div>
          </div>
        )}

        {order.order_status === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium mb-2">订单已取消</p>
            <p className="text-sm text-red-500">库存已自动归还</p>
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
