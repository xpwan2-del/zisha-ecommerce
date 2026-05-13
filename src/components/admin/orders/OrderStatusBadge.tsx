interface OrderStatusBadgeProps {
  status?: string | null;
  type?: 'order' | 'payment' | 'afterSale';
}

const orderStatusMap: Record<string, { label: string; className: string }> = {
  pending: { label: '待付款', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  paid: { label: '待发货', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  shipped: { label: '待收货', className: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  refunding_payment: { label: '待处理退款', className: 'bg-orange-50 text-orange-700 ring-orange-200' },
  refunding: { label: '退款中', className: 'bg-purple-50 text-purple-700 ring-purple-200' },
  delivered: { label: '待评价', className: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
  cancelled: { label: '已取消', className: 'bg-gray-100 text-gray-700 ring-gray-200' },
  refunded: { label: '已退款', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  completed: { label: '已完成', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};

const paymentStatusMap: Record<string, { label: string; className: string }> = {
  unpaid: { label: '未支付', className: 'bg-gray-100 text-gray-700 ring-gray-200' },
  pending: { label: '支付中', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  paid: { label: '已支付', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  refunding: { label: '退款中', className: 'bg-purple-50 text-purple-700 ring-purple-200' },
  refunded: { label: '已退款', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  failed: { label: '支付失败', className: 'bg-red-50 text-red-700 ring-red-200' },
};

export function OrderStatusBadge({ status, type = 'order' }: OrderStatusBadgeProps) {
  const normalized = status || 'unknown';
  const map = type === 'payment' ? paymentStatusMap : orderStatusMap;
  const item = map[normalized] || { label: normalized, className: 'bg-slate-100 text-slate-700 ring-slate-200' };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${item.className}`}>
      {item.label}
    </span>
  );
}
