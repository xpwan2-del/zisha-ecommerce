import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 库存盘点详情与删除
 * ============================================================
 *
 * @api {GET} /api/inventory/checks/[id] 获取盘点详情
 * @apiName GetInventoryCheckDetail
 * @apiGroup INVENTORY
 * @apiDescription 获取指定盘点单的详细信息和盘点项
 *
 * @api {DELETE} /api/inventory/checks/[id] 删除盘点单
 * @apiName DeleteInventoryCheck
 * @apiGroup INVENTORY
 * @apiDescription 删除未完成的盘点单
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'GET',
    path: '/api/inventory/checks/[id]'
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

    logMonitor('INVENTORY', 'INFO', {
      action: 'GET_INVENTORY_CHECK_DETAIL',
      checkId
    });

    const checkResult = await query(
      `SELECT
        ic.id,
        ic.check_number,
        ic.status,
        ic.total_products,
        ic.profit_count,
        ic.loss_count,
        ic.profit_quantity,
        ic.loss_quantity,
        ic.operator_id,
        ic.operator_name,
        ic.completed_at,
        ic.created_at,
        ic.updated_at
      FROM inventory_checks ic
      WHERE ic.id = ?`,
      [checkId]
    );

    if (!checkResult.rows || checkResult.rows.length === 0) {
      logMonitor('INVENTORY', 'NOT_FOUND', {
        action: 'GET_INVENTORY_CHECK_DETAIL',
        checkId,
        reason: 'Inventory check not found'
      });
      return NextResponse.json({
        success: false,
        error: 'Inventory check not found'
      }, { status: 404 });
    }

    const check = checkResult.rows[0];

    const itemsResult = await query(
      `SELECT
        ici.id,
        ici.product_id,
        ici.product_name,
        ici.system_quantity,
        ici.actual_quantity,
        ici.difference,
        ici.difference_type,
        ici.reason,
        ici.status,
        ici.adjusted_at,
        ici.created_at,
        ici.updated_at,
        p.image as product_image
      FROM inventory_check_items ici
      JOIN products p ON ici.product_id = p.id
      WHERE ici.check_id = ?
      ORDER BY ici.difference DESC`,
      [checkId]
    );

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'GET_INVENTORY_CHECK_DETAIL',
      checkId,
      checkNumber: check.check_number,
      itemsCount: itemsResult.rows?.length || 0
    });

    return NextResponse.json({
      success: true,
      data: {
        check: {
          id: check.id,
          check_number: check.check_number,
          status: check.status,
          total_products: check.total_products,
          profit_count: check.profit_count,
          loss_count: check.loss_count,
          profit_quantity: check.profit_quantity,
          loss_quantity: check.loss_quantity,
          operator_id: check.operator_id,
          operator_name: check.operator_name,
          completed_at: check.completed_at,
          created_at: check.created_at,
          updated_at: check.updated_at
        },
        items: (itemsResult.rows || []).map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_image: item.product_image,
          system_quantity: item.system_quantity,
          actual_quantity: item.actual_quantity,
          difference: item.difference,
          difference_type: item.difference_type,
          reason: item.reason,
          status: item.status,
          adjusted_at: item.adjusted_at,
          created_at: item.created_at,
          updated_at: item.updated_at
        }))
      }
    });

  } catch (error) {
    logMonitor('INVENTORY', 'ERROR', {
      action: 'GET_INVENTORY_CHECK_DETAIL',
      error: String(error)
    });
    console.error('Error fetching inventory check:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory check' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'DELETE',
    path: '/api/inventory/checks/[id]'
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

    logMonitor('INVENTORY', 'INFO', {
      action: 'DELETE_INVENTORY_CHECK',
      checkId
    });

    const checkResult = await query(
      'SELECT status FROM inventory_checks WHERE id = ?',
      [checkId]
    );

    if (!checkResult.rows || checkResult.rows.length === 0) {
      logMonitor('INVENTORY', 'NOT_FOUND', {
        action: 'DELETE_INVENTORY_CHECK',
        checkId,
        reason: 'Inventory check not found'
      });
      return NextResponse.json({
        success: false,
        error: 'Inventory check not found'
      }, { status: 404 });
    }

    const status = checkResult.rows[0].status;

    if (status === 'completed') {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        action: 'DELETE_INVENTORY_CHECK',
        checkId,
        reason: 'Cannot delete a completed inventory check'
      });
      return NextResponse.json({
        success: false,
        error: 'Cannot delete a completed inventory check'
      }, { status: 400 });
    }

    await query('BEGIN TRANSACTION');

    await query('DELETE FROM inventory_check_items WHERE check_id = ?', [checkId]);
    await query('DELETE FROM inventory_checks WHERE id = ?', [checkId]);

    await query('COMMIT');

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'DELETE_INVENTORY_CHECK',
      checkId
    });

    return NextResponse.json({
      success: true,
      message: 'Inventory check deleted successfully'
    });

  } catch (error) {
    await query('ROLLBACK');
    logMonitor('INVENTORY', 'ERROR', {
      action: 'DELETE_INVENTORY_CHECK',
      error: String(error)
    });
    console.error('Error deleting inventory check:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete inventory check' },
      { status: 500 }
    );
  }
}
