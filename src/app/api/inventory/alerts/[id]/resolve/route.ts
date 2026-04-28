import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 库存预警解决确认
 * ============================================================
 *
 * @api {POST} /api/inventory/alerts/[id]/resolve 解决库存预警
 * @apiName ResolveInventoryAlert
 * @apiGroup INVENTORY
 * @apiDescription 将指定库存预警标记为已解决状态
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiBody {String} [resolution_note] 处理备注
 * @apiBody {String} [handled_by] 处理人
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} VALIDATION_FAILED 参数验证失败
 * @apiError {String} NOT_FOUND 预警不存在
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'POST',
    path: '/api/inventory/alerts/[id]/resolve'
  });

  try {
    const { id } = await params;
    const alertId = parseInt(id, 10);

    if (isNaN(alertId)) {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        reason: 'Invalid alert ID',
        id
      });
      return NextResponse.json({
        success: false,
        error: 'Invalid alert ID'
      }, { status: 400 });
    }

    const body = await request.json();
    const { resolution_note, handled_by = 'system' } = body;

    logMonitor('INVENTORY', 'INFO', {
      action: 'RESOLVE_INVENTORY_ALERT',
      alertId,
      handled_by
    });

    const alertResult = await query(
      'SELECT * FROM inventory_alerts WHERE id = ?',
      [alertId]
    );

    if (!alertResult.rows || alertResult.rows.length === 0) {
      logMonitor('INVENTORY', 'NOT_FOUND', {
        action: 'RESOLVE_INVENTORY_ALERT',
        alertId,
        reason: 'Alert not found'
      });
      return NextResponse.json({
        success: false,
        error: 'Alert not found'
      }, { status: 404 });
    }

    const alert = alertResult.rows[0];

    if (alert.status === 'resolved') {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        action: 'RESOLVE_INVENTORY_ALERT',
        alertId,
        reason: 'Alert already resolved'
      });
      return NextResponse.json({
        success: false,
        error: 'Alert already resolved'
      }, { status: 400 });
    }

    await query('BEGIN TRANSACTION');

    await query(
      `UPDATE inventory_alerts
       SET status = 'resolved',
           is_resolved = 1,
           resolved_at = datetime('now'),
           resolution_note = ?,
           handled_by = ?,
           handled_at = datetime('now')
       WHERE id = ?`,
      [resolution_note || 'Manually resolved', handled_by, alertId]
    );

    await query(
      `INSERT INTO inventory_alerts (
        product_id, alert_type, current_stock, threshold,
        status, old_status, new_status, is_resolved,
        resolution_note, handled_by, handled_at, created_at
      ) VALUES (?, ?, ?, ?, 'resolved', ?, ?, 1, ?, ?, datetime('now'), datetime('now'))`,
      [
        alert.product_id,
        alert.alert_type,
        alert.current_stock,
        alert.threshold,
        alert.status,
        'resolved',
        resolution_note || 'Manually resolved',
        handled_by
      ]
    );

    await query('COMMIT');

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'RESOLVE_INVENTORY_ALERT',
      alertId,
      productId: alert.product_id,
      alertType: alert.alert_type
    });

    return NextResponse.json({
      success: true,
      data: {
        id: alertId,
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        handled_by: handled_by,
        resolution_note: resolution_note
      },
      message: 'Alert resolved successfully'
    });

  } catch (error) {
    await query('ROLLBACK');
    logMonitor('INVENTORY', 'ERROR', {
      action: 'RESOLVE_INVENTORY_ALERT',
      error: String(error)
    });
    console.error('Error resolving alert:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve alert' },
      { status: 500 }
    );
  }
}
