export const OrderStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPED: 'shipped',
  REFUNDING_PAYMENT: 'refunding_payment',
  REFUNDING: 'refunding',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

export const PaymentStatus = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  REFUNDING: 'refunding',
  REFUNDED: 'refunded',
  FAILED: 'failed',
} as const;

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];

export const AfterSaleStatus = {
  NONE: 'none',
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RETURNING: 'returning',
  COMPLETED: 'completed',
} as const;

export type AfterSaleStatusType = typeof AfterSaleStatus[keyof typeof AfterSaleStatus];

export const OrderEvent = {
  ORDER_CREATED: 'order_created',
  PAY_SUCCESS: 'pay_success',
  PAY_FAILED: 'pay_failed',
  MERCHANT_SHIP: 'merchant_ship',
  USER_CONFIRM: 'user_confirm',
  USER_CANCEL: 'user_cancel',
  ADMIN_CANCEL: 'admin_cancel',
  MERCHANT_CANCEL: 'merchant_cancel',
  TIMEOUT_CANCEL: 'timeout_cancel',
  REFUND_REQUEST: 'refund_request',
  REFUND_APPROVE: 'refund_approve',
  REFUND_SUCCESS: 'refund_success',
  REFUND_REJECT: 'refund_reject',
  AUTO_COMPLETE: 'auto_complete',
} as const;

export type OrderEventType = typeof OrderEvent[keyof typeof OrderEvent];

export const OperatorType = {
  USER: 'user',
  SYSTEM: 'system',
  ADMIN: 'admin',
} as const;

export const DeliverySubStatus = {
  SHIPPING: 'shipping',
  DELIVERING: 'delivering',
  SIGNED: 'signed',
} as const;

export type DeliverySubStatusType = typeof DeliverySubStatus[keyof typeof DeliverySubStatus];
