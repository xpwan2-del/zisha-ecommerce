import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { logMonitor } from '@/lib/utils/logger';
import { checkAdminAuth } from '@/lib/admin-helpers';

function validateInventoryItems(items: unknown) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 500) {
    return { error: 'INVALID_ITEMS', items: [] as any[] };
  }

  const normalized = [];
  for (const item of items) {
    const record = item as Record<string, unknown>;
    const productId = Number.parseInt(String(record.product_id), 10);
    const actualQuantity = Number(record.actual_quantity);
    const reason = record.reason === undefined || record.reason === null ? null : String(record.reason).trim();

    if (!Number.isInteger(productId) || productId <= 0) {
      return { error: 'INVALID_PRODUCT_ID', items: [] as any[] };
    }
    if (!Number.isInteger(actualQuantity) || actualQuantity < 0) {
      return { error: 'INVALID_ACTUAL_QUANTITY', items: [] as any[] };
    }
    if (reason && reason.length > 500) {
      return { error: 'INVALID_REASON', items: [] as any[] };
    }

    normalized.push({ productId, actualQuantity, reason });
  }

  return { error: null, items: normalized };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'POST',
    path: '/api/inventory/checks/[id]/items'
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

    const checkResult = await query(
      'SELECT id, check_number, status FROM inventory_checks WHERE id = ?',
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
    const validation = validateInventoryItems(body.items);

    if (validation.error) {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        action: 'RECORD_INVENTORY_CHECK_ITEMS',
        checkId,
        reason: validation.error
      });
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    logMonitor('INVENTORY', 'INFO', {
      action: 'RECORD_INVENTORY_CHECK_ITEMS',
      checkId,
      itemsCount: validation.items.length
    });

    await query('BEGIN TRANSACTION');

    let updatedCount = 0;
    let profitCount = 0;
    let lossCount = 0;

    for (const item of validation.items) {
      const { productId, actualQuantity, reason } = item;
      const itemResult = await query(
        'SELECT id, system_quantity FROM inventory_check_items WHERE check_id = ? AND product_id = ?',
        [checkId, productId]
      );

      if (!itemResult.rows || itemResult.rows.length === 0) {
        await query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'INVENTORY_CHECK_ITEM_NOT_FOUND' }, { status: 404 });
      }

      const systemQuantity = Number(itemResult.rows[0].system_quantity || 0);
      const difference = actualQuantity - systemQuantity;
      let differenceType = 'ok';

      if (difference > 0) {
        differenceType = 'profit';
        profitCount++;
      } else if (difference < 0) {
        differenceType = 'loss';
        lossCount++;
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
        [actualQuantity, difference, differenceType, reason || null, checkId, productId]
      );

      updatedCount++;
    }

    await query('COMMIT');

    await recordAdminAuditLog({
      request,
      module: 'INVENTORY',
      action: 'RECORD_INVENTORY_CHECK_ITEMS',
      description: `管理员录入库存盘点单实际库存: ${checkResult.rows[0].check_number}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: checkId,
      resourceType: 'inventory_check',
      riskLevel: 'high',
      metadata: {
        checkId,
        checkNumber: checkResult.rows[0].check_number,
        updatedCount,
        totalItems: validation.items.length,
        profitCount,
        lossCount
      }
    });

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'RECORD_INVENTORY_CHECK_ITEMS',
      checkId,
      updatedCount,
      totalItems: validation.items.length
    });

    return NextResponse.json({
      success: true,
      data: {
        updated_count: updatedCount,
        total_items: validation.items.length
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
