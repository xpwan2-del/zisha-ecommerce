export interface IPaymentDriver {
  getMethod(): string;

  createPayment(params: {
    orderId: number;
    orderNumber: string;
    amount: number;
    currency?: string;
    description?: string;
    returnUrl: string;
    notifyUrl: string;
  }): Promise<PaymentCreateResult>;

  verifyCallback(params: Record<string, string>): Promise<boolean>;

  processCallback(params: Record<string, string>): Promise<CallbackResult>;

  queryOrder(platformOrderId: string): Promise<OrderStatusResult>;

  refund(transactionId: string, amount: number, reason?: string): Promise<RefundResult>;
}

export interface PaymentCreateResult {
  success: boolean;
  platformOrderId?: string;
  paymentUrl?: string;
  qrCode?: string;
  error?: string;
}

export interface CallbackResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  transactionId?: string;
  status?: string;
  amount?: number;
  error?: string;
}

export interface OrderStatusResult {
  status: 'pending' | 'success' | 'failed' | 'refunded';
  platformOrderId: string;
  amount?: number;
  paidAt?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

export interface PaymentConfig {
  id: number;
  payment_method: string;
  display_name: string;
  is_enabled: boolean;
  is_sandbox: boolean;
  config_json: string;
  sort_order: number;
}

export interface PaymentTransaction {
  id: number;
  order_id: number;
  payment_method: string;
  transaction_id: string;
  platform_order_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  request_data?: string;
  response_data?: string;
  callback_data?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}