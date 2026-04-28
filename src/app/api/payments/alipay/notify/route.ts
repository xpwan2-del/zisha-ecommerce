import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { OrderStatusService, OrderEvent, OperatorType } from '@/lib/order-status-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const signType = params.get('sign_type');
    const sign = params.get('sign');
    const outTradeNo = params.get('out_trade_no');
    const tradeStatus = params.get('trade_status');
    const totalAmount = params.get('total_amount');
    const tradeNo = params.get('trade_no');

    console.log('=== [Alipay Notify] ===');
    console.log('out_trade_no:', outTradeNo);
    console.log('trade_status:', tradeStatus);
    console.log('total_amount:', totalAmount);
    console.log('trade_no:', tradeNo);

    if (!outTradeNo) {
      console.error('[Alipay Notify] Missing out_trade_no');
      return NextResponse.json('fail', { status: 400 });
    }

    const orderResult = await query(
      'SELECT id, order_number, final_amount, payment_status, order_status FROM orders WHERE order_number = ?',
      [outTradeNo]
    );

    if (orderResult.rows.length === 0) {
      console.error('[Alipay Notify] Order not found:', outTradeNo);
      return NextResponse.json('fail', { status: 404 });
    }

    const order = orderResult.rows[0];

    if (order.payment_status === 'paid') {
      console.log('[Alipay Notify] Order already paid:', outTradeNo);
      return NextResponse.json('success');
    }

    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      const statusResult = await OrderStatusService.changeStatus(
        order.id,
        OrderEvent.PAY_SUCCESS,
        {
          type: OperatorType.SYSTEM,
          id: 0,
          name: 'Alipay'
        },
        { trade_no: tradeNo, trade_status: tradeStatus }
      );

      if (!statusResult.success) {
        console.error('[Alipay Notify] Status change failed:', statusResult.error);
        return NextResponse.json('fail', { status: 500 });
      }

      await query(
        `INSERT INTO order_payments
         (order_id, payment_method, transaction_id, amount, payment_status, paid_at)
         VALUES (?, ?, ?, ?, 'paid', datetime('now'))`,
        [order.id, 'alipay', tradeNo, order.final_amount]
      );

      await query(
        'UPDATE orders SET payment_status = ? WHERE id = ?',
        ['paid', order.id]
      );

      console.log('[Alipay Notify] Order updated to paid:', outTradeNo);

      return NextResponse.json('success');
    }

    console.log('[Alipay Notify] Unknown trade status:', tradeStatus);
    return NextResponse.json('fail');

  } catch (error) {
    console.error('=== [Alipay Notify] Error ===');
    console.error(error);
    return NextResponse.json('fail', { status: 500 });
  }
}