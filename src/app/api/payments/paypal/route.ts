import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - PayPal SDK types not available
import { PayPalHttpClient, orders } from '@paypal/checkout-server-sdk';
import { query } from '@/lib/db';

const clientId = process.env.PAYPAL_CLIENT_ID || '';
const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';

// 服务端价格计算函数
async function calculateItemPrice(productId: number): Promise<number> {
  const productResult = await query(
    'SELECT price FROM products WHERE id = ?',
    [productId]
  );

  if (productResult.rows.length === 0) {
    throw new Error(`Product ${productId} not found`);
  }

  const originalPrice = parseFloat(productResult.rows[0].price) || 0;

  const promoResult = await query(
    `SELECT
      pr.discount_percent,
      pp.can_stack
    FROM product_promotions pp
    JOIN promotions pr ON pp.promotion_id = pr.id
    WHERE pp.product_id = ?
      AND pp.status = 'active'
      AND datetime(pp.start_time) <= datetime('now')
      AND datetime(pp.end_time) >= datetime('now')`,
    [productId]
  );

  const promos = promoResult.rows;
  let finalPrice = originalPrice;

  if (promos.length > 0) {
    const exclusive = promos.find((p: any) => p.can_stack === 1);

    if (exclusive) {
      finalPrice = originalPrice * (1 - exclusive.discount_percent / 100);
    } else {
      let multiplier = 1;
      promos.forEach((p: any) => {
        multiplier *= (1 - p.discount_percent / 100);
      });
      finalPrice = originalPrice * multiplier;
    }
  }

  return finalPrice;
}

// 验证价格函数
async function verifyPrices(items: any[]): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const item of items) {
    const price = await calculateItemPrice(item.product_id);
    const frontendPrice = parseFloat(item.price) || 0;

    if (Math.abs(price - frontendPrice) > 0.01) {
      errors.push(`Price mismatch for product ${item.product_id}: frontend=${frontendPrice}, calculated=${price}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

class PayPalClient {
  private client: any;
  
  constructor() {
    const environment = new orders.Environment.Sandbox(clientId, clientSecret);
    this.client = new PayPalHttpClient(environment);
  }
  
  async execute<T>(request: any): Promise<T> {
    return this.client.execute(request);
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('=== [PayPal Payment API] Processing payment request ===');
    
    const body = await req.json();
    console.log('Received payment data:', JSON.stringify(body, null, 2));
    
    const { amount, currency = 'AED', items } = body;
    console.log('Processing payment - Amount:', amount, 'Currency:', currency, 'Items count:', items?.length || 0);

    // 服务端验证价格（重要安全检查）
    console.log('Verifying prices on server...');
    const { valid, errors } = await verifyPrices(items);
    if (!valid) {
      console.error('Price verification failed:', errors);
      return NextResponse.json({
        error: '价格验证失败',
        details: errors
      }, { status: 400 });
    }
    console.log('Price verification passed');

    // 使用服务端计算的价格
    const calculatedItems = await Promise.all(items.map(async (item: any) => {
      const price = await calculateItemPrice(item.product_id);
      return {
        name: item.name,
        unit_amount: {
          currency_code: currency,
          value: price.toFixed(2),
        },
        quantity: item.quantity,
      };
    }));

    // 计算服务端验证后的总金额
    const verifiedAmount = calculatedItems.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.unit_amount.value) * item.quantity);
    }, 0);

    // 生成订单号
    const orderId = `ORD-${Date.now()}`;
    console.log('Generated order ID:', orderId);

    const paypalClient = new PayPalClient();

    const paypalRequest = new orders.OrdersCreateRequest();
    paypalRequest.prefer('return=representation');
    paypalRequest.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: verifiedAmount.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: currency,
              value: verifiedAmount.toFixed(2),
            },
          },
        },
        items: calculatedItems,
      }],
      application_context: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/cancel`,
      },
    });
    
    console.log('Creating PayPal order...');
    const response = await paypalClient.execute(paypalRequest) as any;
    
    console.log('PayPal order created successfully:', {
      order_id: response.result.id,
      status: response.result.status,
      links: response.result.links?.map((link: any) => ({ rel: link.rel, href: link.href })) || []
    });
    
    const approvalUrl = response.result.links?.find((link: any) => link.rel === 'approve')?.href;
    console.log('Approval URL:', approvalUrl);
    
    return NextResponse.json({ id: response.result.id, url: approvalUrl });
  } catch (error) {
    console.error('=== [PayPal Payment API] Error ===');
    console.error('PayPal error:', error);
    return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 });
  }
}