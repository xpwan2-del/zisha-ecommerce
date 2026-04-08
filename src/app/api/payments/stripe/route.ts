import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20' as any,
}) : null;

export async function POST(request: NextRequest) {
  try {
    console.log('=== [Stripe Payment API] Processing payment request ===');
    
    if (!stripe) {
      console.error('Stripe is not configured');
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }
    
    const body = await request.json();
    console.log('Received payment data:', JSON.stringify(body, null, 2));
    
    const { amount, currency = 'aed', items } = body;
    console.log('Processing payment - Amount:', amount, 'Currency:', currency, 'Items count:', items?.length || 0);
    
    // 生成订单号
    const orderId = `ORD-${Date.now()}`;
    console.log('Generated order ID:', orderId);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map((item: any) => ({
        price_data: {
          currency,
          product_data: {
            name: item.name,
            images: [item.image],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/cancel`,
      metadata: {
        order_id: orderId,
      },
    });
    
    console.log('Stripe session created successfully:', {
      session_id: session.id,
      session_url: session.url,
      order_id: orderId,
      amount: amount,
      currency: currency,
      items: items?.length || 0
    });
    
    return NextResponse.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('=== [Stripe Payment API] Error ===');
    console.error('Stripe error:', error);
    return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 });
  }
}