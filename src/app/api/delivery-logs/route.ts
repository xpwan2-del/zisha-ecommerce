import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { DeliverySubStatus } from '@/lib/order-status-config';

export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({
      success: true,
      data: {
        logs: result.rows,
        current_status: result.rows.length > 0 ? result.rows[0].sub_status : null
      }
    });
  } catch (error) {
    console.error('[DeliveryLogs] GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'FETCH_FAILED'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        order_id,
        sub_status
      }
    });
  } catch (error) {
    console.error('[DeliveryLogs] POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'CREATE_FAILED'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
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

    return NextResponse.json({
      success: true,
      data: { order_id, sub_status }
    });
  } catch (error) {
    console.error('[DeliveryLogs] PUT error:', error);
    return NextResponse.json({
      success: false,
      error: 'UPDATE_FAILED'
    }, { status: 500 });
  }
}