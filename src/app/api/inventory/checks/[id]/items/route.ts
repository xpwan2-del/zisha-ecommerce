import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const checkId = parseInt(id, 10);

    if (isNaN(checkId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid check ID'
      }, { status: 400 });
    }

    const checkResult = await query(
      'SELECT status FROM inventory_checks WHERE id = ?',
      [checkId]
    );

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Inventory check not found'
      }, { status: 404 });
    }

    if (checkResult.rows[0].status === 'completed') {
      return NextResponse.json({
        success: false,
        error: 'Cannot modify items of a completed inventory check'
      }, { status: 400 });
    }

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Items array is required'
      }, { status: 400 });
    }

    await query('BEGIN TRANSACTION');

    let updatedCount = 0;

    for (const item of items) {
      const { product_id, actual_quantity, reason } = item;

      if (!product_id || actual_quantity === undefined) {
        continue;
      }

      const itemResult = await query(
        'SELECT id, system_quantity FROM inventory_check_items WHERE check_id = ? AND product_id = ?',
        [checkId, product_id]
      );

      if (!itemResult.rows || itemResult.rows.length === 0) {
        continue;
      }

      const systemQuantity = itemResult.rows[0].system_quantity;
      const difference = actual_quantity - systemQuantity;
      let differenceType = 'ok';

      if (difference > 0) {
        differenceType = 'profit';
      } else if (difference < 0) {
        differenceType = 'loss';
      }

      await query(
        `UPDATE inventory_check_items
         SET actual_quantity = ?,
             difference = ?,
             difference_type = ?,
             reason = ?,
             status = 'recorded',
             updated_at = datetime('now')
         WHERE check_id = ? AND product_id = ?`,
        [actual_quantity, difference, differenceType, reason || null, checkId, product_id]
      );

      updatedCount++;
    }

    await query('COMMIT');

    return NextResponse.json({
      success: true,
      data: {
        updated_count: updatedCount,
        total_items: items.length
      },
      message: `成功录入 ${updatedCount} 个商品的实际库存`
    });

  } catch (error) {
    await query('ROLLBACK');
    console.error('Error recording inventory check items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record inventory check items' },
      { status: 500 }
    );
  }
}
