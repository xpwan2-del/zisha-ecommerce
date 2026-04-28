'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { OrderStatusBadge } from './OrderStatusBadge';

export interface OrderItem {
  id: number;
  product_id: number;
  name: string;
  name_en?: string;
  image: string;
  price: number;
  quantity: number;
}

export interface Order {
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
}

interface OrderCardProps {
  order: Order;
  onViewDetails?: (order: Order) => void;
}

export function OrderCard({ order, onViewDetails }: OrderCardProps) {
  const router = useRouter();
  const firstItem = order.items?.[0];
  const itemCount = order.items?.length || 0;

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(order);
    } else {
      router.push(`/account?tab=orders&id=${order.id}`);
    }
  };

  const handleCardClick = () => {
    handleViewDetails();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionButtons = () => {
    switch (order.order_status) {
      case 'pending':
        return (
          <>
            <button className="px-4 py-2 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors"
              style={{ backgroundColor: 'var(--accent)' }}>
              立即支付
            </button>
            <button className="px-4 py-2 border rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              再次购买
            </button>
          </>
        );
      case 'paid':
      case 'processing':
        return (
          <button className="px-4 py-2 border rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            再次购买
          </button>
        );
      case 'shipped':
        return (
          <>
            <button className="px-4 py-2 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors"
              style={{ backgroundColor: 'var(--accent)' }}>
              确认收货
            </button>
            <button className="px-4 py-2 border rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              再次购买
            </button>
          </>
        );
      case 'reviewing':
        return (
          <>
            <button className="px-4 py-2 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors"
              style={{ backgroundColor: 'var(--accent)' }}>
              去评价
            </button>
            <button className="px-4 py-2 border rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              再次购买
            </button>
          </>
        );
      case 'completed':
        return (
          <button className="px-4 py-2 border rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            再次购买
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden transition-shadow hover:shadow-md"
      style={{ borderColor: 'var(--border)' }}>
      <div className="flex justify-between items-center px-4 py-3 border-b"
        style={{ backgroundColor: 'var(--background-alt)', borderColor: 'var(--border)' }}>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {formatDate(order.created_at)}
        </div>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          订单号：{order.order_number}
        </div>
        <OrderStatusBadge status={order.order_status} />
      </div>

      <div className="p-4 cursor-pointer" onClick={handleCardClick}>
        <div className="flex gap-4">
          {firstItem && (
            <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={firstItem.image || '/placeholder.png'}
                alt={firstItem.name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
              {firstItem?.name || '商品'}
              {itemCount > 1 && <span className="text-gray-400 font-normal"> (+{itemCount - 1}件)</span>}
            </h3>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              ¥{order.final_amount.toFixed(2)}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {order.currency || 'AED'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-3 px-4 py-3 border-t"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background-alt)' }}>
        {getActionButtons()}
        <button
          onClick={handleViewDetails}
          className="text-sm font-medium cursor-pointer transition-colors hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          查看详情 →
        </button>
      </div>
    </div>
  );
}
