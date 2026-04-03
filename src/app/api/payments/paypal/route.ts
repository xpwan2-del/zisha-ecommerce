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
    const body = await req.json();
    const { amount, currency = 'AED', items } = body;
    
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
    
    const response = await paypalClient.execute(paypalRequest) as any;
    
    const approvalUrl = response.result.links?.find((link: any) => link.rel === 'approve')?.href;
    
    return NextResponse.json({ id: response.result.id, url: approvalUrl });
  } catch (error) {
    console.error('PayPal error:', error);
    return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 });
  }
}