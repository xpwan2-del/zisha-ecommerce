'use client';

interface OrderStatusCardProps {
  order: {
    order_status: string;
    order_number: string;
    final_amount: number;
    currency: string;
  };
}

const statusConfig: Record<string, { title: string; description: string; bgColor: string; borderColor: string }> = {
  pending: {
    title: '待支付订单',
    description: '请在 23:59:59 前完成支付',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  paid: {
    title: '支付成功',
    description: '商品正在准备中',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  processing: {
    title: '处理中',
    description: '商家正在准备商品',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  shipped: {
    title: '商品已发货',
    description: '预计3-5天送达',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  reviewing: {
    title: '等待评价',
    description: '确认收货后可评价商品',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  completed: {
    title: '订单完成',
    description: '感谢您的购买',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  cancelled: {
    title: '订单已取消',
    description: '订单已取消',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  refunding: {
    title: '退款处理中',
    description: '退款将在3-7个工作日内到账',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  refunded: {
    title: '已退款',
    description: '退款已完成',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

export function OrderStatusCard({ order }: OrderStatusCardProps) {
  const config = statusConfig[order.order_status] || statusConfig.pending;

  const getIcon = () => {
    switch (order.order_status) {
      case 'pending':
        return (
          <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'paid':
      case 'processing':
        return (
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'shipped':
        return (
          <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        );
      case 'reviewing':
        return (
          <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center">
        {getIcon()}
        <div className="flex-1 ml-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            {config.title}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {config.description}
          </p>
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
  );
}
