import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { DeliverySubStatus } from '@/lib/order-status-config';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {GET} /api/delivery-logs 获取配送日志
 * @apiName GetDeliveryLogs
 * @apiGroup DELIVERY
 * @apiDescription 获取订单配送状态变更日志。
 */


export async function GET(request: NextRequest) {
  try {
    logMonitor('DELIVERY', 'REQUEST', { method: 'GET', action: 'GET_DELIVERY_LOGS' });

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({
        success: false,
        error: 'ORDER_ID_REQUIRED'
      }, { status: 400 });
    }

    const result = await query(
      `SELECT * FROM delivery_logs 
       WHERE order_id = ? 
       ORDER BY occurred_at DESC`,
      [orderId]
    );

    logMonitor('DELIVERY', 'SUCCESS', { action: 'GET_DELIVERY_LOGS', order_id: orderId, logs_count: result.rows.length });
    return NextResponse.json({
      success: true,
      data: {
        logs: result.rows,
        current_status: result.rows.length > 0 ? result.rows[0].sub_status : null
      }
    });
  } catch (error: any) {
    logMonitor('DELIVERY', 'ERROR', { action: 'GET_DELIVERY_LOGS', error: error?.message || String(error) });
    console.error('[DeliveryLogs] GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'FETCH_FAILED'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    logMonitor('DELIVERY', 'REQUEST', { method: 'POST', action: 'CREATE_DELIVERY_LOG' });

    const body = await request.json();
    const { order_id, sub_status, carrier, tracking_number, location, description, occurred_at } = body;

    if (!order_id || !sub_status) {
      return NextResponse.json({
        success: false,
        error: 'ORDER_ID_AND_STATUS_REQUIRED'
      }, { status: 400 });
    }

    if (!Object.values(DeliverySubStatus).includes(sub_status)) {
      return NextResponse.json({
        success: false,
        error: `INVALID_STATUS: ${sub_status}. Valid values: ${Object.values(DeliverySubStatus).join(', ')}`
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO delivery_logs 
       (order_id, sub_status, carrier, tracking_number, location, description, occurred_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        order_id,
        sub_status,
        carrier || null,
        tracking_number || null,
        location || null,
        description || null,
        occurred_at || new Date().toISOString()
      ]
    );

    logMonitor('DELIVERY', 'SUCCESS', { action: 'CREATE_DELIVERY_LOG', order_id, sub_status, log_id: result.lastInsertRowid });
    return NextResponse.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        order_id,
        sub_status
      }
    });
  } catch (error: any) {
    logMonitor('DELIVERY', 'ERROR', { action: 'CREATE_DELIVERY_LOG', error: error?.message || String(error) });
    console.error('[DeliveryLogs] POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'CREATE_FAILED'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    logMonitor('DELIVERY', 'REQUEST', { method: 'PUT', action: 'UPDATE_DELIVERY_LOG' });

    const body = await request.json();
    const { order_id, sub_status, carrier, tracking_number, location, description } = body;

    if (!order_id || !sub_status) {
      return NextResponse.json({
        success: false,
        error: 'ORDER_ID_AND_STATUS_REQUIRED'
      }, { status: 400 });
    }

    await query(
      `INSERT INTO delivery_logs 
       (order_id, sub_status, carrier, tracking_number, location, description, occurred_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        order_id,
        sub_status,
        carrier || null,
        tracking_number || null,
        location || null,
        description || null,
        new Date().toISOString()
      ]
    );

    logMonitor('DELIVERY', 'SUCCESS', { action: 'UPDATE_DELIVERY_LOG', order_id, sub_status });
    return NextResponse.json({
      success: true,
      data: { order_id, sub_status }
    });
  } catch (error: any) {
    logMonitor('DELIVERY', 'ERROR', { action: 'UPDATE_DELIVERY_LOG', error: error?.message || String(error) });
    console.error('[DeliveryLogs] PUT error:', error);
    return NextResponse.json({
      success: false,
      error: 'UPDATE_FAILED'
    }, { status: 500 });
  }
}