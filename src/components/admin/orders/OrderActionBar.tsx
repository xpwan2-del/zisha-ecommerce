import { OrderStatusBadge } from './OrderStatusBadge';

interface RefundRetryInfo {
  canRetry?: boolean;
  eventId?: string | null;
  platform?: string | null;
  failureStage?: string | null;
  processingState?: string | null;
  retryCount?: number;
  lastRetryAt?: string | null;
  errorMessage?: string | null;
}

interface OrderActionBarProps {
  order: {
    id: number;
    order_status?: string | null;
    payment_status?: string | null;
  } | null;
  refundRetry?: RefundRetryInfo | null;
  isSubmitting?: boolean;
  onShip: () => void;
  onApproveRefund: () => void;
  onRejectRefund: () => void;
  onRetryRefund: () => void;
}

export function OrderActionBar({ order, refundRetry, isSubmitting = false, onShip, onApproveRefund, onRejectRefund, onRetryRefund }: OrderActionBarProps) {
  if (!order) return null;

  const canShip = order.order_status === 'paid' && order.payment_status === 'paid';
  const canReviewRefund = order.order_status === 'refunding_payment';
  const canRetryRefund = Boolean(refundRetry?.canRetry);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>当前状态</span>
        <OrderStatusBadge status={order.order_status} />
        <OrderStatusBadge status={order.payment_status} type="payment" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canShip || isSubmitting}
          onClick={onShip}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          发货
        </button>
        <button
          type="button"
          disabled={!canReviewRefund || isSubmitting}
          onClick={onApproveRefund}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          同意退款
        </button>
        <button
          type="button"
          disabled={!canReviewRefund || isSubmitting}
          onClick={onRejectRefund}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          拒绝退款
        </button>
        <button
          type="button"
          disabled={!canRetryRefund || isSubmitting}
          onClick={onRetryRefund}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          重试退款
        </button>
      </div>
    </div>
  );
}
