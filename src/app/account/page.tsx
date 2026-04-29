"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { AddressList, AddressForm } from '@/components/addresses';

interface UserCoupon {
  id: number;
  user_id?: number;
  coupon_id: number;
  user_coupon_status?: string;
  expires_at: string;
  received_at?: string;
  used_order_id?: number | null;
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  is_permanent: boolean;
  permanent_days: number;
  is_stackable: boolean;
  stackable_text: string;
  is_expired: number;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

type MyCouponTab = 'available' | 'expired' | 'used';
type OrderTab = 'all' | 'pending' | 'paid' | 'shipped' | 'reviewing' | 'refund';

interface OrderItem {
  id: number;
  product_id: number;
  name: string;
  name_en?: string;
  image: string;
  price: number;
  quantity: number;
}

interface Order {
  id: number;
  order_number: string;
  order_status: string;
  payment_status: string;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  final_amount: number;
  currency: string;
  created_at: string;
  items: OrderItem[];
  delivery_sub_status?: string;
  address?: { contact_name: string; phone: string; full_address: string };
}

function formatDiscount(type: 'percentage' | 'fixed', value: number): string {
  if (type === 'percentage') {
    return `${value}% OFF`;
  }
  return `减 ${value} 元`;
}

function getRemainingDays(expiresAt: string): number {
  const now = new Date();
  const expire = new Date(expiresAt);
  const diff = expire.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function CouponCard({ userCoupon, isExpired, isUsed, isLoggedIn }: {
  userCoupon: UserCoupon;
  isExpired?: boolean;
  isUsed?: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const remainingDays = getRemainingDays(userCoupon.expires_at);
  const isDisabled = !userCoupon.is_active || isExpired || isUsed;
  const isAvailable = !isDisabled;

  const handleUseClick = () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    router.push('/');
  };

  const getCardStyle = () => {
    if (isDisabled) return 'opacity-60';
    if (isHovered) return 'shadow-xl';
    return 'shadow-lg';
  };

  const getStatusBadge = () => {
    if (isUsed) return <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded">已使用</span>;
    if (isExpired) return <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded">已过期</span>;
    if (userCoupon.is_permanent) return <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">长期有效</span>;
    return <span className="bg-accent text-white text-xs px-2 py-1 rounded">剩余 {remainingDays} 天</span>;
  };

  const getDiscountColor = () => {
    if (isUsed || isExpired) return 'from-gray-400 to-gray-500';
    return 'from-accent to-accent-hover';
  };

  return (
    <div
      className={`bg-card rounded-xl overflow-hidden transition-all duration-200 cursor-pointer border borderBorder ${getCardStyle()}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex">
        <div className={`bg-gradient-to-br ${getDiscountColor()} p-6 flex flex-col items-center justify-center w-[160px] shrink-0`}>
          <span className="text-white text-2xl font-bold">{formatDiscount(userCoupon.type, userCoupon.value)}</span>
          <span className="text-white/80 text-xs mt-2 bg-white/20 px-2 py-0.5 rounded">{userCoupon.stackable_text}</span>
        </div>
        <div className="flex-1 p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{userCoupon.name}</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{userCoupon.code}</p>
            </div>
            {getStatusBadge()}
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--text)' }}>{userCoupon.description}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {!userCoupon.is_permanent && userCoupon.permanent_days > 0 && (
              <span className="bg-gray-100 px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>有效期 {userCoupon.permanent_days} 天</span>
            )}
            {userCoupon.is_permanent && (
              <span className="bg-green-100 px-2 py-1 rounded" style={{ color: 'var(--color-green)' }}>长期有效</span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-green-600 text-sm">✓ 已领取</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              领取于 {userCoupon.received_at ? new Date(userCoupon.received_at).toLocaleDateString('zh-CN') : '-'}
            </span>
          </div>
          {isAvailable && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleUseClick}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ background: 'var(--accent)' }}
              >
                立即使用
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AvailableCouponCard({ coupon, onReceive, isLoggedIn }: {
  coupon: UserCoupon;
  onReceive: (couponId: number) => void;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const getCardStyle = () => {
    if (isHovered) return 'shadow-xl';
    return 'shadow-lg';
  };

  const getDiscountColor = () => 'from-green-500 to-green-600';

  const handleReceiveClick = () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    onReceive(coupon.id);
  };

  return (
    <div
      className={`bg-card rounded-xl overflow-hidden transition-all duration-200 cursor-pointer border borderBorder ${getCardStyle()}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex">
        <div className={`bg-gradient-to-br ${getDiscountColor()} p-6 flex flex-col items-center justify-center w-[160px] shrink-0`}>
          <span className="text-white text-2xl font-bold">{formatDiscount(coupon.type, coupon.value)}</span>
          <span className="text-white/80 text-xs mt-2 bg-white/20 px-2 py-0.5 rounded">{coupon.stackable_text}</span>
        </div>
        <div className="flex-1 p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{coupon.name}</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{coupon.code}</p>
            </div>
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">待领取</span>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--text)' }}>{coupon.description}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {!coupon.is_permanent && coupon.permanent_days > 0 && (
              <span className="bg-gray-100 px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>有效期 {coupon.permanent_days} 天</span>
            )}
            {coupon.is_permanent && (
              <span className="bg-green-100 px-2 py-1 rounded" style={{ color: 'var(--color-green)' }}>长期有效</span>
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleReceiveClick}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: 'var(--accent)' }}
            >
              立即领取
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, isSelected, onToggle, onAddressUpdated }: { order: Order; isSelected: boolean; onToggle: (o: Order) => void; onAddressUpdated?: () => void }) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isAddressEditing, setIsAddressEditing] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  const statusMap: Record<string, { label: string; bg: string }> = {
    pending: { label: '待付款', bg: 'bg-yellow-500' },
    paid: { label: '待发货', bg: 'bg-blue-500' },
    shipped: { label: '已发货', bg: 'bg-purple-500' },
    reviewing: { label: '待评价', bg: 'bg-yellow-500' },
    refunding: { label: '退款中', bg: 'bg-orange-500' },
    refunded: { label: '已退款', bg: 'bg-gray-500' },
    cancelled: { label: '已取消', bg: 'bg-gray-400' }
  };
  const s = statusMap[order.order_status] || { label: order.order_status, bg: 'var(--accent)' };

  const getBtns = () => {
    switch (order.order_status) {
      case 'pending':
        return (<><button className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors hover:opacity-90" style={{ background: 'var(--accent)', color: '#fff' }}>立即支付</button><button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs cursor-pointer hover:bg-gray-200 transition-colors">取消订单</button><button onClick={handleEditAddress} className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors">修改地址</button></>);
      case 'paid':
        return (<><button className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors hover:opacity-90" style={{ background: 'var(--accent)', color: '#fff' }}>申请退款</button><button onClick={handleEditAddress} className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors">修改地址</button></>);
      case 'shipped':
        return (<><button className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors hover:opacity-90" style={{ background: 'var(--accent)', color: '#fff' }}>申请退款</button><button className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors hover:opacity-90" style={{ background: 'var(--primary)', color: '#fff' }}>查看物流</button></>);
      case 'reviewing':
        return (<><button className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors hover:opacity-90" style={{ background: 'var(--primary)', color: '#fff' }}>再来一单</button><button className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors hover:opacity-90" style={{ background: 'var(--accent)', color: '#fff' }}>评价商品</button></>);
      case 'refunding':
        return (<button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs cursor-pointer hover:bg-gray-200 transition-colors">撤销退款</button>);
      default:
        return null;
    }
  };

  const statusLabelMap: Record<string, string> = {
    pending: '待付款',
    paid: '已支付',
    shipped: '已发货',
    reviewing: '待评价',
    completed: '已完成',
    cancelled: '已取消',
    refunding: '退款中',
    refunded: '已退款'
  };

  const fetchAddresses = async () => {
    try {
      setIsLoadingAddresses(true);
      const response = await fetch('/api/addresses', { credentials: 'include' });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAddresses(result.data);
          const defaultAddr = result.data.find((a: any) => a.is_default);
          if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleEditAddress = async () => {
    setIsAddressEditing(true);
    await fetchAddresses();
  };

  const handleSelectAddress = (id: number) => {
    setSelectedAddressId(id);
  };

  const handleConfirmAddress = async () => {
    if (!selectedAddressId) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/address`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ address_id: selectedAddressId })
      });
      const result = await response.json();
      if (result.success) {
        setIsAddressEditing(false);
        if (!isSelected) onToggle(order);
        onAddressUpdated?.();
      } else {
        alert(result.error || '更新地址失败');
      }
    } catch (err) {
      alert('更新地址失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNewAddress = () => {
    setShowNewAddressForm(true);
  };

  const handleCancelEdit = () => {
    setIsAddressEditing(false);
  };

  const handleCancelNewAddress = () => {
    setShowNewAddressForm(false);
  };

  return (
    <div className="rounded-lg border transition-shadow duration-200" style={{ background: 'var(--card)', borderColor: 'var(--border)', boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="p-3 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)', background: 'var(--background-alt)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{order.created_at?.split(' ')[0]}</span>
          <span className="font-mono text-xs" style={{ color: 'var(--text)' }}>{order.order_number}</span>
        </div>
        <span className="text-white text-xs px-2 py-0.5 rounded font-medium" style={{ background: s.bg.includes('var') ? 'var(--accent)' : s.bg }}>{s.label}</span>
      </div>
      <div className="p-3">
        <div className="space-y-2">
          {(order.items || []).map(item => (
            <div key={item.id} className="flex items-center gap-3">
              <img src={item.image || 'https://picsum.photos/80'} alt={item.name} className="w-12 h-12 object-cover rounded border" style={{ borderColor: 'var(--border)' }} />
              <div className="flex-1">
                <h4 className="font-medium text-sm" style={{ color: 'var(--text)' }}>{item.name}</h4>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{order.currency} {item.price.toFixed(2)} × {item.quantity}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>实付：</span>
            <span className="text-base font-bold ml-1" style={{ color: 'var(--accent)' }}>{order.currency} {order.final_amount.toFixed(2)}</span>
          </div>
          <div className="flex gap-2 items-center">
            {getBtns()}
            <button onClick={() => onToggle(order)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs cursor-pointer hover:bg-gray-200 transition-colors">
              {isSelected ? '收起' : '查看详情'}
            </button>
          </div>
        </div>
      </div>

      {isSelected && (
        <div className="border-t p-4 bg-gray-50" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>订单详情</h3>
            <button onClick={() => onToggle(order)} className="px-3 py-1 bg-gray-200 text-gray-600 rounded text-xs cursor-pointer hover:bg-gray-300 transition-colors">
              收起
            </button>
          </div>
          <div className="space-y-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--card)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text)' }}>订单号：{order.order_number}</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>下单时间：{order.created_at}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  order.order_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  order.order_status === 'paid' ? 'bg-blue-100 text-blue-800' :
                  order.order_status === 'shipped' ? 'bg-indigo-100 text-indigo-800' :
                  order.order_status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {statusLabelMap[order.order_status] || order.order_status}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--card)' }}>
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>收货信息</h4>
              <div className="space-y-1 text-sm">
                <p style={{ color: 'var(--text-muted)' }}>收货人：{order.address?.contact_name || '未填写'}</p>
                <p style={{ color: 'var(--text-muted)' }}>联系电话：{order.address?.phone || '未填写'}</p>
                <p style={{ color: 'var(--text-muted)' }}>收货地址：{order.address?.full_address || '未填写'}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--card)' }}>
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>商品清单</h4>
              <div className="space-y-2">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded" style={{ backgroundColor: 'var(--background)' }}>
                    <div className="w-16 h-16 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                      <img src={item.image || '/placeholder.png'} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>单价：{order.currency} {item.price.toFixed(2)} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{order.currency} {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--card)' }}>
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>费用明细</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>商品总价：</span>
                  <span style={{ color: 'var(--text)' }}>{order.currency} {order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>运费：</span>
                  <span style={{ color: 'var(--text)' }}>{order.currency} {order.shipping_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>优惠：</span>
                  <span style={{ color: 'var(--accent)' }}>-{order.currency} {order.discount_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--text)' }}>实付金额：</span>
                  <span style={{ color: 'var(--accent)' }}>{order.currency} {order.final_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddressEditing && (
        <div className="border-t p-4" style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--background-alt)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>选择收货地址</h3>
            <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoadingAddresses ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
            </div>
          ) : showNewAddressForm ? (
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium" style={{ color: 'var(--text)' }}>新增收货地址</h4>
                <button onClick={handleCancelNewAddress} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <AddressForm
                onSubmit={async (formData) => {
                  setIsSubmitting(true);
                  try {
                    const response = await fetch('/api/addresses', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify(formData)
                    });
                    const result = await response.json();
                    if (result.success) {
                      await fetchAddresses();
                      setSelectedAddressId(result.data?.id || result.data);
                      setShowNewAddressForm(false);
                    } else {
                      alert(result.error || '添加地址失败');
                    }
                  } catch (err) {
                    alert('添加地址失败');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                onCancel={handleCancelNewAddress}
                isLoading={isSubmitting}
              />
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {addresses.map(addr => (
                  <div
                    key={addr.id}
                    onClick={() => handleSelectAddress(addr.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-2' : 'border'}`}
                    style={{
                      borderColor: selectedAddressId === addr.id ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: 'var(--card)'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor: selectedAddressId === addr.id ? 'var(--accent)' : 'var(--border)',
                          backgroundColor: selectedAddressId === addr.id ? 'var(--accent)' : 'transparent'
                        }}
                      >
                        {selectedAddressId === addr.id && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{addr.contact_name}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{addr.phone}</span>
                          {addr.is_default && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>默认</span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                          {[addr.state_name, addr.city, addr.street_address].filter(Boolean).join(' ')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddNewAddress}
                  className="px-4 py-2 border rounded text-sm cursor-pointer"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  + 新增地址
                </button>
                <button
                  onClick={handleConfirmAddress}
                  disabled={!selectedAddressId || isSubmitting}
                  className="flex-1 py-2 rounded text-sm font-medium cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                >
                  {isSubmitting ? '确认中...' : '确认'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  const { user, isLoading, logout, checkAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [allCoupons, setAllCoupons] = useState<UserCoupon[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[]>([]);
  const [myCouponsTab, setMyCouponsTab] = useState<MyCouponTab>('available');
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderTab, setOrderTab] = useState<OrderTab>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    console.log('[AccountPage] Mounted, user:', user, 'isLoading:', isLoading);
    const verifyAuth = async () => {
      await checkAuth();
    };
    verifyAuth();
  }, [checkAuth]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && activeTab === 'coupons') {
      fetchCoupons();
      fetchAvailableCoupons();
    }
    if (user && activeTab === 'orders') {
      fetchOrders();
    }
  }, [user, activeTab]);

  const fetchOrders = async () => {
    if (!user) return;
    setIsLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders-list?limit=200`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.orders)) {
          setOrders(data.data.orders);
        } else {
          setOrders([]);
        }
      } else {
        console.error('[AccountPage] fetchOrders failed:', res.status);
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const getOrderTabCount = (tab: OrderTab) => {
    switch (tab) {
      case 'all': return orders.length;
      case 'pending': return orders.filter(o => o.order_status === 'pending').length;
      case 'paid': return orders.filter(o => o.order_status === 'paid').length;
      case 'shipped': return orders.filter(o => o.order_status === 'shipped').length;
      case 'reviewing': return orders.filter(o => o.order_status === 'reviewing').length;
      case 'refund': return orders.filter(o => ['refunding', 'refunded'].includes(o.order_status)).length;
      default: return 0;
    }
  };

  const filteredOrders = orderTab === 'all' 
    ? orders 
    : orders.filter(o => orderTab === 'refund' 
        ? ['refunding', 'refunded'].includes(o.order_status) 
        : o.order_status === orderTab);

  const fetchCoupons = async () => {
    if (!user) return;
    setIsLoadingCoupons(true);
    try {
      const res = await fetch('/api/coupons?status=all&limit=100', {
        headers: { 'x-user-id': String(user.id) }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.user_coupons)) {
          setAllCoupons(data.data.user_coupons);
        }
      }
    } catch (err) {
      console.error('Error fetching coupons:', err);
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  const fetchAvailableCoupons = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/coupons?status=available&limit=100', {
        headers: { 'x-user-id': String(user.id) }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.available_coupons)) {
          setAvailableCoupons(data.data.available_coupons);
        }
      }
    } catch (err) {
      console.error('Error fetching available coupons:', err);
    }
  };

  const handleReceive = async (couponId: number) => {
    if (!user) return;
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id)
        },
        body: JSON.stringify({ coupon_id: couponId })
      });
      if (res.ok) {
        fetchCoupons();
        fetchAvailableCoupons();
      }
    } catch (err) {
      console.error('Error receiving coupon:', err);
    }
  };

  const activeCoupons = allCoupons.filter(c => c.user_coupon_status === 'active' && c.is_expired === 0);
  const expiredCoupons = allCoupons.filter(c => c.user_coupon_status === 'active' && c.is_expired === 1);
  const usedCoupons = allCoupons.filter(c => c.user_coupon_status === 'used');

  const getTabCount = (tab: MyCouponTab) => {
    switch (tab) {
      case 'available': return activeCoupons.length;
      case 'expired': return expiredCoupons.length;
      case 'used': return usedCoupons.length;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card p-8 rounded-lg shadow-lg border border-border">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-center text-text">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card p-8 rounded-lg shadow-lg border border-border">
          <div className="text-accent mb-4">❌ 未登录</div>
          <button 
            onClick={() => router.push('/login')}
            className="w-full bg-accent text-white py-2 px-4 rounded hover:bg-accent transition-colors"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* 左侧导航栏 */}
          <div className="md:w-64 flex-shrink-0">
            {/* 个人信息卡片 */}
            <div className="bg-card rounded-lg shadow-lg border border-border p-6 mb-6">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-dark flex items-center justify-center mb-4">
                  <span className="text-accent text-2xl font-semibold">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <h3 className="text-lg font-semibold text-dark mb-1">{user.name}</h3>
                <p className="text-text-muted text-sm mb-3">{user.email}</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-accent text-white text-xs px-2 py-1 rounded">
                    {user.level || '普通'}
                  </span>
                  <span className="text-text-muted text-xs">{user.points || 0} 积分</span>
                </div>
              </div>
            </div>

            {/* 导航菜单 */}
            <div className="bg-card rounded-lg shadow-lg border border-border p-4">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-md transition-colors ${activeTab === 'overview' ? 'bg-accent text-white' : 'text-text hover:bg-background-alt'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  账户概览
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-md transition-colors ${activeTab === 'orders' ? 'bg-accent text-white' : 'text-text hover:bg-background-alt'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  订单管理
                </button>
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-md transition-colors ${activeTab === 'addresses' ? 'bg-accent text-white' : 'text-text hover:bg-background-alt'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  地址管理
                </button>
                <button
                  onClick={() => setActiveTab('favorites')}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-md transition-colors ${activeTab === 'favorites' ? 'bg-accent text-white' : 'text-text hover:bg-background-alt'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  收藏夹
                </button>
                <button
                  onClick={() => setActiveTab('coupons')}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-md transition-colors ${activeTab === 'coupons' ? 'bg-accent text-white' : 'text-text hover:bg-background-alt'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  优惠券
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-md transition-colors ${activeTab === 'messages' ? 'bg-accent text-white' : 'text-text hover:bg-background-alt'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  消息中心
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-md transition-colors ${activeTab === 'settings' ? 'bg-accent text-white' : 'text-text hover:bg-background-alt'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  个人设置
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-3 text-left rounded-md transition-colors text-text hover:bg-background-alt mt-6"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  退出登录
                </button>
              </nav>
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1">
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-2xl font-semibold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>账户概览</h2>
                  
                  {/* 个人信息 */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-dark mb-4">个人信息</h3>
                    <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">姓名</label>
                        <div className="bg-background p-3 rounded border border-border">{user.name}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">邮箱</label>
                        <div className="bg-background p-3 rounded border border-border">{user.email}</div>
                      </div>
                      {user.phone && (
                        <div>
                          <label className="block text-sm font-medium text-text-muted mb-1">电话</label>
                          <div className="bg-background p-3 rounded border border-border">{user.phone}</div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">角色</label>
                        <div className="bg-background p-3 rounded border border-border">{user.role}</div>
                      </div>
                    </div>
                  </div>

                  {/* 账户信息 */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-dark mb-4">账户信息</h3>
                    <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">会员等级</label>
                        <div className="bg-background p-3 rounded border border-border">
                          <span className="bg-accent text-white text-xs px-2 py-1 rounded">
                            {user.level || '普通'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">积分</label>
                        <div className="bg-background p-3 rounded border border-border">{user.points || 0}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">总消费</label>
                        <div className="bg-background p-3 rounded border border-border">{user.total_spent || 0} AED</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">推荐码</label>
                        <div className="bg-background p-3 rounded border border-border">{user.referral_code || '无'}</div>
                      </div>
                    </div>
                  </div>

                  {/* 最近订单 */}
                  <div>
                    <h3 className="text-lg font-medium text-dark mb-4">最近订单</h3>
                    <div className="bg-background p-4 rounded border border-border">
                      <p className="text-text-muted text-center">暂无订单记录</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div>
                  <h2 className="text-2xl font-semibold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>订单管理</h2>
                  
                  <div className="flex border-b mb-6" style={{ borderColor: 'var(--border)' }}>
                    {(['all', 'pending', 'paid', 'shipped', 'reviewing', 'refund'] as OrderTab[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setOrderTab(tab)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 cursor-pointer ${orderTab === tab ? 'border-accent' : 'border-transparent'}`}
                        style={{ color: orderTab === tab ? 'var(--accent)' : 'var(--text-muted)' }}
                      >
                        {tab === 'all' ? '全部' : tab === 'pending' ? '待付款' : tab === 'paid' ? '待发货' : tab === 'shipped' ? '待收货' : tab === 'reviewing' ? '评价' : '退款/售后'} ({getOrderTabCount(tab)})
                      </button>
                    ))}
                  </div>

                  <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                    {isLoadingOrders ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <div className="rounded border p-8 text-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                        <p style={{ color: 'var(--text-muted)' }}>暂无订单记录</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredOrders.map(order => (
                          <OrderCard key={order.id} order={order} isSelected={selectedOrder?.id === order.id} onToggle={(o) => setSelectedOrder(selectedOrder?.id === o.id ? null : o)} onAddressUpdated={fetchOrders} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'addresses' && (
                <div>
                  <h2 className="text-2xl font-semibold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>地址管理</h2>
                  <AddressList />
                </div>
              )}

              {activeTab === 'favorites' && (
                <div>
                  <h2 className="text-2xl font-semibold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>收藏夹</h2>
                  <div className="bg-background p-4 rounded border border-border">
                    <p className="text-text-muted text-center">暂无收藏记录</p>
                  </div>
                </div>
              )}

              {activeTab === 'coupons' && (
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                  <h2 className="text-2xl font-semibold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>我的优惠券</h2>

                  {isLoadingCoupons ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
                    </div>
                  ) : (
                    <>
                      <div className="flex border-b mb-6" style={{ borderColor: 'var(--border)' }}>
                        <button
                          onClick={() => setMyCouponsTab('available')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                            myCouponsTab === 'available' ? 'border-accent' : 'border-transparent'
                          }`}
                          style={{ color: myCouponsTab === 'available' ? 'var(--accent)' : 'var(--text-muted)' }}
                        >
                          可用 ({getTabCount('available')})
                        </button>
                        <button
                          onClick={() => setMyCouponsTab('expired')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                            myCouponsTab === 'expired' ? 'border-accent' : 'border-transparent'
                          }`}
                          style={{ color: myCouponsTab === 'expired' ? 'var(--accent)' : 'var(--text-muted)' }}
                        >
                          已过期 ({getTabCount('expired')})
                        </button>
                        <button
                          onClick={() => setMyCouponsTab('used')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                            myCouponsTab === 'used' ? 'border-accent' : 'border-transparent'
                          }`}
                          style={{ color: myCouponsTab === 'used' ? 'var(--accent)' : 'var(--text-muted)' }}
                        >
                          已使用 ({getTabCount('used')})
                        </button>
                      </div>

                      <div className="space-y-4 mb-8">
                        {myCouponsTab === 'available' && (
                          activeCoupons.length === 0 ? (
                            <div className="rounded-lg border p-8 text-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                              <p style={{ color: 'var(--text-muted)' }}>暂无可用优惠券</p>
                            </div>
                          ) : (
                            activeCoupons.map(coupon => (
                              <CouponCard key={coupon.id} userCoupon={coupon} isLoggedIn={!!user} />
                            ))
                          )
                        )}
                        {myCouponsTab === 'expired' && (
                          expiredCoupons.length === 0 ? (
                            <div className="rounded-lg border p-8 text-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                              <p style={{ color: 'var(--text-muted)' }}>无已过期优惠券</p>
                            </div>
                          ) : (
                            expiredCoupons.map(coupon => (
                              <CouponCard key={coupon.id} userCoupon={coupon} isExpired={true} isLoggedIn={!!user} />
                            ))
                          )
                        )}
                        {myCouponsTab === 'used' && (
                          usedCoupons.length === 0 ? (
                            <div className="rounded-lg border p-8 text-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                              <p style={{ color: 'var(--text-muted)' }}>无已使用优惠券</p>
                            </div>
                          ) : (
                            usedCoupons.map(coupon => (
                              <CouponCard key={coupon.id} userCoupon={coupon} isUsed={true} isLoggedIn={!!user} />
                            ))
                          )
                        )}
                      </div>

                      <div className="mt-10">
                        <h3 className="text-xl font-medium mb-4" style={{ color: 'var(--text)' }}>可领取优惠券</h3>
                        <div className="space-y-4">
                          {availableCoupons.length === 0 ? (
                            <div className="rounded-lg border p-8 text-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                              <p style={{ color: 'var(--text-muted)' }}>暂无可领取优惠券</p>
                            </div>
                          ) : (
                            availableCoupons.map(coupon => (
                              <AvailableCouponCard
                                key={coupon.id}
                                coupon={coupon}
                                onReceive={handleReceive}
                                isLoggedIn={!!user}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'messages' && (
                <div>
                  <h2 className="text-2xl font-semibold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>消息中心</h2>
                  <div className="bg-background p-4 rounded border border-border">
                    <p className="text-text-muted text-center">暂无消息</p>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h2 className="text-2xl font-semibold text-dark mb-6" style={{ fontFamily: 'Cormorant, serif' }}>个人设置</h2>
                  <div className="bg-background p-4 rounded border border-border">
                    <p className="text-text-muted text-center">设置功能正在开发中</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
