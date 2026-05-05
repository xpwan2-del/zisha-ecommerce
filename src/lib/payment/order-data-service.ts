// src/lib/payment/order-data-service.ts
import { query } from '@/lib/db';
import { OrderPaymentData } from './types';

export async function getPaymentOrderData(
  orderNumber: string,
  expectedMethod?: string
): Promise<OrderPaymentData> {
  const orderResult = await query(
    `SELECT id, order_number, final_amount, shipping_fee,
            total_original_price, order_final_discount_amount,
            total_coupon_discount, order_status, payment_method, created_at
     FROM orders WHERE order_number = ?`,
    [orderNumber]
  );

  if (orderResult.rows.length === 0) {
    throw new PaymentDataError('ORDER_NOT_FOUND', '订单不存在', 404);
  }

  const order = orderResult.rows[0];

  if (order.order_status !== 'pending') {
    throw new PaymentDataError(
      'ORDER_STATUS_INVALID',
      '订单状态不允许支付',
      400
    );
  }

  if (expectedMethod && order.payment_method !== expectedMethod) {
    throw new PaymentDataError(
      'PAYMENT_METHOD_MISMATCH',
      `订单支付方式不匹配，期望: ${expectedMethod}，实际: ${order.payment_method}`,
      400
    );
  }

  const itemsResult = await query(
    `SELECT oi.product_id, p.name as product_name, oi.quantity, oi.original_price
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [order.id]
  );

  if (itemsResult.rows.length === 0) {
    throw new PaymentDataError('ORDER_EMPTY', '订单无商品', 400);
  }

  const finalAmount = parseFloat(order.final_amount) || 0;
  const shippingFee = parseFloat(order.shipping_fee) || 0;
  const itemTotal = parseFloat(order.total_original_price) || 0;
  const discountAmount = parseFloat(order.order_final_discount_amount) || 0;

  return {
    order: {
      id: order.id,
      order_number: order.order_number,
      final_amount: finalAmount,
      shipping_fee: shippingFee,
      total_original_price: itemTotal,
      order_final_discount_amount: discountAmount,
      total_coupon_discount: parseFloat(order.total_coupon_discount) || 0,
      order_status: order.order_status,
      payment_method: order.payment_method,
      created_at: order.created_at,
    },
    items: itemsResult.rows.map((item: any) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      original_price: parseFloat(item.original_price) || 0,
    })),
    finalAmount,
    shippingFee,
    itemTotal,
    discountAmount,
  };
}

export class PaymentDataError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
