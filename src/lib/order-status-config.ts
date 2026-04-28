export const OrderStatus = {
  PENDING: 'pending',
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  REVIEWING: 'reviewing',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDING: 'refunding',
  REFUNDED: 'refunded',
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

export const OrderEvent = {
  ORDER_CREATED: 'order_created',
  USER_CONFIRM_PAYMENT: 'user_confirm_payment',
  PAY_SUCCESS: 'pay_success',
  PAY_FAILED: 'pay_failed',
  MERCHANT_CONFIRM: 'merchant_confirm',
  MERCHANT_SHIP: 'merchant_ship',
  USER_CONFIRM: 'user_confirm',
  USER_CANCEL: 'user_cancel',
  ADMIN_CANCEL: 'admin_cancel',
  MERCHANT_CANCEL: 'merchant_cancel',
  TIMEOUT_CANCEL: 'timeout_cancel',
  REFUND_REQUEST: 'refund_request',
  REFUND_SUCCESS: 'refund_success',
  REFUND_REJECT: 'refund_reject',
  REVIEW_COMPLETE: 'review_complete',
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