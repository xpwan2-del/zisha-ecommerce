import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const orderId = id;
    const userId = authResult.user?.userId;

    const body = await request.json();
    const { address_id } = body;

    if (!address_id) {
      return NextResponse.json(
        { success: false, error: 'Missing address_id' },
        { status: 400 }
      );
    }

    const orderResult = await query(
      `SELECT id, order_status, user_id FROM orders WHERE id = ?`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    if (order.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    if (!['pending', 'paid'].includes(order.order_status)) {
      return NextResponse.json(
        { success: false, error: 'Cannot modify address for this order status' },
        { status: 400 }
      );
    }

    const addressResult = await query(
      `SELECT id FROM addresses WHERE id = ? AND user_id = ?`,
      [address_id, userId]
    );

    if (addressResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      );
    }

    await query(
      `UPDATE orders SET shipping_address_id = ?, updated_at = datetime('now') WHERE id = ?`,
      [address_id, orderId]
    );

    return NextResponse.json({
      success: true,
      message: 'Address updated successfully'
    });
  } catch (error) {
    console.error('Error updating order address:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
