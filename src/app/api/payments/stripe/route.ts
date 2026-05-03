import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {POST} /api/payments/stripe 创建 Stripe 支付
 * @apiName CreateStripePayment
 * @apiGroup PAYMENTS
 * @apiDescription 创建 Stripe Checkout Session，返回支付跳转链接。
 */


const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20' as any,
}) : null;

// 服务端价格计算函数
async function calculateItemPrice(productId: number, quantity: number): Promise<{ price: number; originalPrice: number }> {
  // 查询商品原价
  const productResult = await query(
    'SELECT pp.price FROM product_prices pp WHERE pp.product_id = ? AND pp.currency = ?',
    [productId, 'USD']
  );

  if (productResult.rows.length === 0) {
    throw new Error(`Product ${productId} not found`);
  }

  const originalPrice = parseFloat(productResult.rows[0].price) || 0;

  // 查询有效促销
  const promoResult = await query(
    `SELECT
      pr.discount_percent,
      pp.can_stack,
      pp.priority
    FROM product_promotions pp
    JOIN promotions pr ON pp.promotion_id = pr.id
    WHERE pp.product_id = ?
      AND datetime(pp.start_time) <= datetime('now')
      AND datetime(pp.end_time) >= datetime('now')`,
    [productId]
  );

  const promos = promoResult.rows;
  let finalPrice = originalPrice;

  if (promos.length > 0) {
    // 检查是否有独占 (can_stack === 1)，等于一的时候是独占
    const exclusive = promos.find((p: any) => p.can_stack === 1);

    if (exclusive) {
      finalPrice = originalPrice * (1 - exclusive.discount_percent / 100);
    } else {
      // 叠加计算
      let multiplier = 1;
      promos.forEach((p: any) => {
        multiplier *= (1 - p.discount_percent / 100);
      });
      finalPrice = originalPrice * multiplier;
    }
  }

  return { price: finalPrice, originalPrice };
}

// 验证价格函数
async function verifyPrices(items: any[]): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const item of items) {
    const { price } = await calculateItemPrice(item.product_id, item.quantity);
    const frontendPrice = parseFloat(item.price) || 0;

    if (Math.abs(price - frontendPrice) > 0.01) {
      errors.push(`Price mismatch for product ${item.product_id}: frontend=${frontendPrice}, calculated=${price}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function POST(request: NextRequest) {
  try {
    logMonitor('PAYMENTS', 'REQUEST', { method: 'POST', path: '/api/payments/stripe' });
    console.log('=== [Stripe Payment API] Processing payment request ===');
    
    if (!stripe) {
      logMonitor('PAYMENTS', 'ERROR', { action: 'STRIPE_NOT_CONFIGURED' });
      console.error('Stripe is not configured');
      return NextResponse.json({
        success: false,
        error: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured'
      }, { status: 500 });
    }
    
    const body = await request.json();
    console.log('Received payment data:', JSON.stringify(body, null, 2));
    
    const { amount, currency = 'aed', items, order_number, source = 'cart' } = body;
    console.log('Processing payment - Amount:', amount, 'Currency:', currency, 'Items count:', items?.length || 0);

    // 验证订单号
    if (!order_number) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', { reason: 'Missing order_number' });
      console.error('[Stripe] Missing order_number parameter');
      return NextResponse.json({
        success: false,
        error: 'MISSING_ORDER_NUMBER',
        message: '缺少订单号 order_number'
      }, { status: 400 });
    }
    console.log('[Stripe] Using order_number:', order_number);

    // 服务端验证价格（重要安全检查）
    console.log('Verifying prices on server...');
    const { valid, errors } = await verifyPrices(items);
    if (!valid) {
      logMonitor('PAYMENTS', 'VALIDATION_FAILED', { action: 'PRICE_VERIFICATION', errors });
      console.error('Price verification failed:', errors);
      return NextResponse.json({
        success: false,
        error: 'PRICE_VERIFICATION_FAILED',
        message: '价格验证失败',
        details: errors
      }, { status: 400 });
    }
    console.log('Price verification passed');

    // 使用服务端计算的价格
    const lineItems = await Promise.all(items.map(async (item: any) => {
      const { price } = await calculateItemPrice(item.product_id, item.quantity);
      return {
        price_data: {
          currency,
          product_data: {
            name: item.name,
            images: [item.image],
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: item.quantity,
      };
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/result?order_number=${order_number}&session_id={CHECKOUT_SESSION_ID}&source=${source}&platform=stripe`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/result?order_number=${order_number}&source=${source}&platform=stripe&status=cancel`,
      metadata: {
        order_number: order_number,
      },
    });
    
    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'STRIPE_SESSION_CREATED',
      sessionId: session.id,
      orderNumber: order_number,
      currency: currency,
      itemCount: items?.length || 0
    });
    console.log('Stripe session created successfully:', {
      session_id: session.id,
      session_url: session.url,
      order_number: order_number,
      amount: amount,
      currency: currency,
      items: items?.length || 0
    });
    
    return NextResponse.json({
      success: true,
      data: {
        payment_id: session.id,
        redirect_url: session.url
      }
    });
  } catch (error) {
    logMonitor('PAYMENTS', 'ERROR', { action: 'STRIPE_PAYMENT', error: String(error) });
    console.error('=== [Stripe Payment API] Error ===');
    console.error('Stripe error:', error);
    return NextResponse.json({
      success: false,
      error: 'PAYMENT_CREATION_FAILED',
      message: 'Payment creation failed'
    }, { status: 500 });
  }
}