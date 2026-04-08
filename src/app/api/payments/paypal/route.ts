import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - PayPal SDK types not available
import { PayPalHttpClient, orders } from '@paypal/checkout-server-sdk';

const clientId = process.env.PAYPAL_CLIENT_ID || '';
const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';

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
          value: amount.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
          },
        },
        items: items.map((item: any) => ({
          name: item.name,
          unit_amount: {
            currency_code: currency,
            value: item.price.toFixed(2),
          },
          quantity: item.quantity,
        })),
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