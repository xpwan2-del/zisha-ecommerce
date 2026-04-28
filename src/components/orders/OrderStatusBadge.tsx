'use client';

interface OrderStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  pending: { label: '待付款', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  paid: { label: '已支付', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  processing: { label: '处理中', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  shipped: { label: '已发货', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' },
  reviewing: { label: '待评价', bgColor: 'bg-amber-100', textColor: 'text-amber-800' },
  completed: { label: '已完成', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  cancelled: { label: '已取消', bgColor: 'bg-gray-100', textColor: 'text-gray-600' },
  refunding: { label: '退款中', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  refunded: { label: '已退款', bgColor: 'bg-red-100', textColor: 'text-red-800' },
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, bgColor: 'bg-gray-100', textColor: 'text-gray-600' };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      {config.label}
    </span>
  );
}
