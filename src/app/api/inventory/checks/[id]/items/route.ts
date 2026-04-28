import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 库存盘点商品录入
 * ============================================================
 *
 * @api {POST} /api/inventory/checks/[id]/items 录入盘点商品实际库存
 * @apiName RecordInventoryCheckItems
 * @apiGroup INVENTORY
 * @apiDescription 批量录入盘点商品的实际库存数量
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} VALIDATION_FAILED 参数验证失败
 * @apiError {String} NOT_FOUND 盘点单不存在
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'POST',
    path: '/api/inventory/checks/[id]/items'
  });

  try {
    const { id } = await params;
    const checkId = parseInt(id, 10);

    if (isNaN(checkId)) {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        reason: 'Invalid check ID',
        id
      });
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
      logMonitor('INVENTORY', 'NOT_FOUND', {
        action: 'RECORD_INVENTORY_CHECK_ITEMS',
        checkId,
        reason: 'Inventory check not found'
      });
      return NextResponse.json({
        success: false,
        error: 'Inventory check not found'
      }, { status: 404 });
    }

    if (checkResult.rows[0].status === 'completed') {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        action: 'RECORD_INVENTORY_CHECK_ITEMS',
        checkId,
        reason: 'Cannot modify items of a completed inventory check'
      });
      return NextResponse.json({
        success: false,
        error: 'Cannot modify items of a completed inventory check'
      }, { status: 400 });
    }

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        action: 'RECORD_INVENTORY_CHECK_ITEMS',
        checkId,
        reason: 'Items array is required'
      });
      return NextResponse.json({
        success: false,
        error: 'Items array is required'
      }, { status: 400 });
    }

    logMonitor('INVENTORY', 'INFO', {
      action: 'RECORD_INVENTORY_CHECK_ITEMS',
      checkId,
      itemsCount: items.length
    });

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

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'RECORD_INVENTORY_CHECK_ITEMS',
      checkId,
      updatedCount,
      totalItems: items.length
    });

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
    logMonitor('INVENTORY', 'ERROR', {
      action: 'RECORD_INVENTORY_CHECK_ITEMS',
      error: String(error)
    });
    console.error('Error recording inventory check items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record inventory check items' },
      { status: 500 }
    );
  }
}
