// src/lib/payment/stripe-adapter.ts
import Stripe from 'stripe';
import { OrderPaymentData, PaymentRequest, RedirectPaymentResult, PaymentAdapter } from './types';
import { PaymentService } from './PaymentService';
import { logMonitor } from '@/lib/utils/logger';

function parseStripeConfig() {
  const config = PaymentService.getConfig('stripe');
  const json = config?.config_json ? JSON.parse(config.config_json) : {};
  return {
    secretKey: json.secret_key || json.secretKey || json.stripe_secret_key || process.env.STRIPE_SECRET_KEY,
  };
}

export class StripeAdapter implements PaymentAdapter {
  async createPayment(
    orderData: OrderPaymentData,
    request: PaymentRequest
  ): Promise<RedirectPaymentResult> {
    const { secretKey } = parseStripeConfig();
    if (!secretKey) {
      throw new Error('Stripe is not configured');
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' as any });

    const { order, items, finalAmount, shippingFee, itemTotal, discountAmount } = orderData;
    const { order_number, currency = 'aed', source = 'cart' } = request;

    logMonitor('PAYMENTS', 'REQUEST', {
      action: 'STRIPE_ADAPTER_CREATE',
      orderNumber: order_number,
      itemCount: items.length,
      shippingFee,
      discountAmount,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // 将订单级别折扣按比例分摊到每个商品
    const discountRatio = itemTotal > 0 ? discountAmount / itemTotal : 0;

    const lineItems = items.map((item) => {
      const originalUnitPrice = item.original_price;
      const discountPerItem = originalUnitPrice * discountRatio;
      const finalUnitPrice = Math.max(0, originalUnitPrice - discountPerItem);

      return {
        price_data: {
          currency,
          product_data: {
            name: item.product_name || `Product ${item.product_id}`,
          },
          unit_amount: Math.round(finalUnitPrice * 100),
        },
        quantity: item.quantity,
      };
    });

    // 运费作为 shipping_options
    const shippingOptions = shippingFee > 0
      ? [{
          shipping_rate_data: {
            type: 'fixed_amount' as const,
            fixed_amount: {
              amount: Math.round(shippingFee * 100),
              currency,
            },
            display_name: 'Shipping Fee',
          },
        }]
      : undefined;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      ...(shippingOptions && { shipping_options: shippingOptions }),
      success_url: `${baseUrl}/api/payments/result?order_number=${order_number}&session_id={CHECKOUT_SESSION_ID}&source=${source}&platform=stripe`,
      cancel_url: `${baseUrl}/api/payments/result?order_number=${order_number}&source=${source}&platform=stripe&status=cancel`,
      metadata: {
        order_number,
      },
    });

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'STRIPE_SESSION_CREATED',
      sessionId: session.id,
      orderNumber: order_number,
      currency,
      itemCount: items.length,
    });

    return {
      type: 'redirect',
      paymentId: session.id,
      redirectUrl: session.url || '',
    };
  }
}
