import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const alertId = parseInt(id, 10);

    if (isNaN(alertId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid alert ID'
      }, { status: 400 });
    }

    const body = await request.json();
    const { resolution_note, handled_by = 'system' } = body;

    const alertResult = await query(
      'SELECT * FROM inventory_alerts WHERE id = ?',
      [alertId]
    );

    if (!alertResult.rows || alertResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Alert not found'
      }, { status: 404 });
    }

    const alert = alertResult.rows[0];

    if (alert.status === 'resolved') {
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
    console.error('Error resolving alert:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve alert' },
      { status: 500 }
    );
  }
}
