import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment/PaymentService';
import { logMonitor } from '@/lib/utils/logger';

export async function GET(request: Request) {
  try {
    await PaymentService.initialize();

    const methods = await PaymentService.getAvailableMethods();

    const formattedMethods = methods.map(method => ({
      code: method.payment_method,
      name: method.display_name,
      isSandbox: method.is_sandbox,
      isEnabled: method.is_enabled
    }));

    logMonitor('PAYMENT', 'GET_METHODS', { count: formattedMethods.length });

    return NextResponse.json({
      success: true,
      data: formattedMethods
    });
  } catch (error: any) {
    console.error('[Payment Methods] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get payment methods'
    }, { status: 500 });
  }
}