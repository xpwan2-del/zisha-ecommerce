import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment/PaymentService';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {GET} /api/payments/methods 获取支付方式
 * @apiName GetPaymentMethods
 * @apiGroup PAYMENTS
 * @apiDescription 获取当前可用的支付方式列表。
 */


export async function GET(request: Request) {
  logMonitor('PAYMENTS', 'REQUEST', {
    method: 'GET',
    path: '/api/payments/methods'
  });

  try {
    await PaymentService.initialize();

    const methods = await PaymentService.getAvailableMethods();

    const formattedMethods = methods.map(method => ({
      code: method.payment_method,
      name: method.display_name,
      isSandbox: method.is_sandbox,
      isEnabled: method.is_enabled
    }));

    logMonitor('PAYMENTS', 'SUCCESS', {
      action: 'GET_METHODS',
      count: formattedMethods.length
    });

    return NextResponse.json({
      success: true,
      data: formattedMethods
    });
  } catch (error: any) {
    logMonitor('PAYMENTS', 'ERROR', {
      action: 'GET_METHODS',
      error: String(error)
    });
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get payment methods'
    }, { status: 500 });
  }
}