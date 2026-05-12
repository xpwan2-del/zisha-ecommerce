import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createInventoryTransaction, InventoryTransactionCode } from '@/lib/inventory-transactions';
import { logMonitor } from '@/lib/utils/logger';
import { checkAdminAuth } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';

/**
 * ============================================================
 * 库存盘点完成确认
 * ============================================================
 *
 * @api {POST} /api/inventory/checks/[id]/complete 完成盘点并调整库存
 * @apiName CompleteInventoryCheck
 * @apiGroup INVENTORY
 * @apiDescription 完成盘点单的确认操作，根据实际库存与系统库存的差异调整库存
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
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'POST',
    path: '/api/inventory/checks/[id]/complete'
  });

  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

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

    logMonitor('INVENTORY', 'INFO', {
      action: 'COMPLETE_INVENTORY_CHECK',
      checkId
    });

    const checkResult = await query(
      'SELECT * FROM inventory_checks WHERE id = ?',
      [checkId]
    );

    if (!checkResult.rows || checkResult.rows.length === 0) {
      logMonitor('INVENTORY', 'NOT_FOUND', {
        action: 'COMPLETE_INVENTORY_CHECK',
        checkId,
        reason: 'Inventory check not found'
      });
      return NextResponse.json({
        success: false,
        error: 'Inventory check not found'
      }, { status: 404 });
    }

    const check = checkResult.rows[0];

    if (check.status === 'completed') {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        action: 'COMPLETE_INVENTORY_CHECK',
        checkId,
        reason: 'Inventory check already completed'
      });
      return NextResponse.json({
        success: false,
        error: 'Inventory check already completed'
      }, { status: 400 });
    }

    const incompleteItemsResult = await query(
      `SELECT COUNT(*) as count
       FROM inventory_check_items
       WHERE check_id = ? AND (actual_quantity IS NULL OR status != 'recorded')`,
      [checkId]
    );

    const incompleteItemsCount = parseInt(String(incompleteItemsResult.rows?.[0]?.count || 0));
    if (incompleteItemsCount > 0) {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        action: 'COMPLETE_INVENTORY_CHECK',
        checkId,
        reason: 'Inventory check items not fully recorded',
        incompleteItemsCount
      });
      return NextResponse.json({
        success: false,
        error: 'Inventory check items not fully recorded'
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

      // 记录无差异完成审计日志
      await recordAdminAuditLog({
        request,
        module: 'INVENTORY',
        action: 'COMPLETE_CHECK',
        description: '管理员确认库存盘点完成 (无差异)',
        operator: auth.user.name || 'Admin',
        status: 'success',
        resourceId: checkId,
        resourceType: 'inventory_check',
        riskLevel: 'low',
        metadata: {
          checkNumber: check.check_number,
          itemsCount: 0
        }
      });

      logMonitor('INVENTORY', 'SUCCESS', {
        action: 'COMPLETE_INVENTORY_CHECK',
        checkId,
        checkNumber: check.check_number,
        adjustedCount: 0,
        message: '盘点完成，无库存差异'
      });

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
        'SELECT quantity FROM inventory WHERE product_id = ?',
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

      const transactionTypeCode = differenceType === 'profit'
        ? InventoryTransactionCode.STOCK_GAIN
        : InventoryTransactionCode.STOCK_LOSE;

      await createInventoryTransaction({
        productId,
        productName: item.product_name,
        transactionTypeCode,
        quantityChange: difference,
        quantityBefore: beforeQuantity,
        quantityAfter: afterQuantity,
        reason: `盘点单修正: ${check.check_number}`,
        referenceType: 'check',
        referenceId: checkId,
        operatorId: auth.user.userId,
        operatorName: auth.user.name || 'Admin',
      });

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

    // 记录有差异完成审计日志
    await recordAdminAuditLog({
      request,
      module: 'INVENTORY',
      action: 'COMPLETE_CHECK',
      description: '管理员确认库存盘点完成 (并执行差异修正)',
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: checkId,
      resourceType: 'inventory_check',
      riskLevel: 'critical',
      metadata: {
        checkNumber: check.check_number,
        profitCount,
        lossCount,
        profitQuantity,
        lossQuantity
      }
    });

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'COMPLETE_INVENTORY_CHECK',
      checkId,
      checkNumber: check.check_number,
      adjustedCount: itemsWithDiff.length,
      profitCount,
      lossCount,
      profitQuantity,
      lossQuantity
    });

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
    logMonitor('INVENTORY', 'ERROR', {
      action: 'COMPLETE_INVENTORY_CHECK',
      error: String(error)
    });
    console.error('Error completing inventory check:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete inventory check' },
      { status: 500 }
    );
  }
}
