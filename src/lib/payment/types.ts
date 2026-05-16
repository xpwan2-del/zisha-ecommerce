// src/lib/payment/types.ts

export interface OrderPaymentData {
  order: {
    id: number;
    order_number: string;
    final_amount: number;
    shipping_fee: number;
    total_original_price: number;
    order_final_discount_amount: number;
    total_coupon_discount: number;
    order_status: string;
    payment_method: string;
    created_at: string;
  };
  items: OrderPaymentItem[];
  finalAmount: number;
  shippingFee: number;
  itemTotal: number;
  discountAmount: number;
}

export interface OrderPaymentItem {
  product_id: number;
  product_name: string;
  quantity: number;
  original_price: number;
}

export interface PaymentRequest {
  order_number: string;
  currency?: string;
  lang?: string;
  source?: string;
  extra?: Record<string, string>;
}

export interface RefundPaymentRequest {
  orderId: number;
  orderNumber: string;
  paymentMethod: string;
  paymentId?: string | null;
  referenceId?: string | null;
  amount: number;
  currency?: string;
  reason?: string;
  operatorId: number;
  operatorName: string;
}

export interface RefundPaymentResult {
  success: boolean;
  platform: string;
  refundId?: string | null;
  status: 'processing' | 'succeeded' | 'failed';
  raw?: unknown;
}

export type PaymentGatewayResult =
  | RedirectPaymentResult
  | SdkParamsPaymentResult;

export interface RedirectPaymentResult {
  type: 'redirect';
  paymentId: string;
  redirectUrl: string;
}

export interface SdkParamsPaymentResult {
  type: 'sdk_params';
  paymentId: string;
  sdkParams: {
    prepayId: string;
    paySign: string;
    nonceStr: string;
    timestamp: string;
    signType: string;
  };
}

export interface ChannelConfig {
  channel: string;
  amountUnit: 'main' | 'cents';
  supportsLineItems: boolean;
  responseType: 'redirect' | 'sdk_params';
  defaultCurrency: string;
  supportedCurrencies: string[];
  requiresClientIp: boolean;
  requiresOpenid: boolean;
}

export interface PaymentAdapter {
  createPayment(
    orderData: OrderPaymentData,
    request: PaymentRequest
  ): Promise<PaymentGatewayResult>;

  refundPayment(
    request: RefundPaymentRequest
  ): Promise<RefundPaymentResult>;
}
