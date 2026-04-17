import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

function calculateStatusId(quantity: number): number {
  if (quantity <= 0) return 4;
  if (quantity <= 5) return 3;
  if (quantity <= 10) return 2;
  return 1;
}

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
      'SELECT * FROM inventory_checks WHERE id = ?',
      [checkId]
    );

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Inventory check not found'
      }, { status: 404 });
    }

    const check = checkResult.rows[0];

    if (check.status === 'completed') {
      return NextResponse.json({
        success: false,
        error: 'Inventory check already completed'
      }, { status: 400 });
    }

    const itemsResult = await query(
      `SELECT
        ici.product_id,
        ici.product_name,
        ici.system_quantity,
        ici.actual_quantity,
        ici.difference,
        ici.difference_type
       FROM inventory_check_items ici
       WHERE ici.check_id = ? AND ici.difference != 0`,
      [checkId]
    );

    const itemsWithDiff = itemsResult.rows || [];

    if (itemsWithDiff.length === 0) {
      await query('BEGIN TRANSACTION');

      await query(
        `UPDATE inventory_checks
         SET status = 'completed',
             completed_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ?`,
        [checkId]
      );

      await query(
        `UPDATE inventory_check_items
         SET status = 'completed',
             adjusted_at = datetime('now'),
             updated_at = datetime('now')
         WHERE check_id = ?`,
        [checkId]
      );

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          check_id: checkId,
          check_number: check.check_number,
          status: 'completed',
          adjusted_count: 0,
          message: '盘点完成，无库存差异'
        }
      });
    }

    await query('BEGIN TRANSACTION');

    let profitCount = 0;
    let lossCount = 0;
    let profitQuantity = 0;
    let lossQuantity = 0;

    for (const item of itemsWithDiff) {
      const productId = item.product_id;
      const difference = item.difference;
      const differenceType = item.difference_type;

      const beforeResult = await query(
        'SELECT quantity, low_stock_threshold FROM inventory WHERE product_id = ?',
        [productId]
      );

      if (!beforeResult.rows || beforeResult.rows.length === 0) {
        continue;
      }

      const beforeQuantity = beforeResult.rows[0].quantity;
      const afterQuantity = beforeQuantity + difference;

      await query(
        `UPDATE inventory
         SET quantity = ?,
             status_id = ?,
             updated_at = datetime('now')
         WHERE product_id = ?`,
        [afterQuantity, calculateStatusId(afterQuantity), productId]
      );

      const transactionType = differenceType === 'profit' ? 'profit' : 'loss';

      await query(
        `INSERT INTO inventory_transactions (
          product_id, product_name, transaction_type, quantity_change,
          quantity_before, quantity_after, reason,
          reference_type, reference_id, operator_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          productId,
          item.product_name,
          transactionType,
          difference,
          beforeQuantity,
          afterQuantity,
          `盘点差异: ${differenceType}`,
          'check',
          checkId,
          check.operator_name || 'system'
        ]
      );

      await query(
        `UPDATE inventory_check_items
         SET status = 'completed',
             adjusted_at = datetime('now'),
             updated_at = datetime('now')
         WHERE check_id = ? AND product_id = ?`,
        [checkId, productId]
      );

      if (differenceType === 'profit') {
        profitCount++;
        profitQuantity += difference;
      } else {
        lossCount++;
        lossQuantity += Math.abs(difference);
      }
    }

    await query(
      `UPDATE inventory_checks
       SET status = 'completed',
           profit_count = ?,
           loss_count = ?,
           profit_quantity = ?,
           loss_quantity = ?,
           completed_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`,
      [profitCount, lossCount, profitQuantity, lossQuantity, checkId]
    );

    await query('COMMIT');

    return NextResponse.json({
      success: true,
      data: {
        check_id: checkId,
        check_number: check.check_number,
        status: 'completed',
        profit_count: profitCount,
        loss_count: lossCount,
        profit_quantity: profitQuantity,
        loss_quantity: lossQuantity,
        completed_at: new Date().toISOString()
      },
      message: `盘点完成：盘盈 ${profitCount} 个商品（共 ${profitQuantity} 件），盘亏 ${lossCount} 个商品（共 ${lossQuantity} 件）`
    });

  } catch (error) {
    await query('ROLLBACK');
    console.error('Error completing inventory check:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete inventory check' },
      { status: 500 }
    );
  }
}
