import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 库存预警列表
 * ============================================================
 *
 * @api {GET} /api/inventory/alerts 获取库存预警列表
 * @apiName GetInventoryAlerts
 * @apiGroup INVENTORY
 * @apiDescription 获取库存预警列表，支持按状态、预警类型、商品ID筛选
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiQuery {String} [status] 预警状态 (active|resolved|ignored)
 * @apiQuery {String} [alert_type] 预警类型 (low_stock|overstock|expiry|damage)
 * @apiQuery {Number} [product_id] 商品ID
 * @apiQuery {Number} [page] 页码
 * @apiQuery {Number} [limit] 每页数量
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

export async function GET(request: NextRequest) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'GET',
    path: '/api/inventory/alerts'
  });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const alert_type = searchParams.get('alert_type');
    const product_id = searchParams.get('product_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    logMonitor('INVENTORY', 'INFO', {
      action: 'GET_INVENTORY_ALERTS',
      filters: { status, alert_type, product_id },
      pagination: { page, limit }
    });

    const whereConditions: string[] = [];
    const params: any[] = [];

    if (status) {
      whereConditions.push('ia.status = ?');
      params.push(status);
    }

    if (alert_type) {
      whereConditions.push('ia.alert_type = ?');
      params.push(alert_type);
    }

    if (product_id) {
      whereConditions.push('ia.product_id = ?');
      params.push(product_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as count FROM inventory_alerts ia ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(String(countResult.rows?.[0]?.count || 0));

    const alertsQuery = `
      SELECT
        ia.id,
        ia.product_id,
        ia.alert_type,
        ia.current_stock,
        ia.threshold,
        ia.status,
        ia.old_status,
        ia.new_status,
        ia.is_resolved,
        ia.resolved_at,
        ia.resolution_note,
        ia.handled_by,
        ia.handled_at,
        ia.created_at,
        p.name as product_name,
        p.image as product_image
      FROM inventory_alerts ia
      JOIN products p ON ia.product_id = p.id
      ${whereClause}
      ORDER BY ia.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const alertsResult = await query(alertsQuery, [...params, limit, offset]);
    const alerts = alertsResult.rows || [];

    const statsQuery = `
      SELECT
        status,
        COUNT(*) as count
      FROM inventory_alerts
      GROUP BY status
    `;
    const statsResult = await query(statsQuery);
    const stats = statsResult.rows || [];

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'GET_INVENTORY_ALERTS',
      alertsCount: alerts.length,
      total,
      stats: stats.map((s: any) => ({ status: s.status, count: parseInt(s.count) }))
    });

    return NextResponse.json({
      success: true,
      data: {
        alerts: alerts.map((a: any) => ({
          id: a.id,
          product_id: a.product_id,
          product_name: a.product_name,
          product_image: a.product_image,
          alert_type: a.alert_type,
          current_stock: a.current_stock,
          threshold: a.threshold,
          status: a.status,
          old_status: a.old_status,
          new_status: a.new_status,
          is_resolved: Boolean(a.is_resolved),
          resolved_at: a.resolved_at,
          resolution_note: a.resolution_note,
          handled_by: a.handled_by,
          handled_at: a.handled_at,
          created_at: a.created_at
        })),
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        },
        stats: stats.map((s: any) => ({
          status: s.status,
          count: parseInt(s.count)
        }))
      }
    });

  } catch (error) {
    logMonitor('INVENTORY', 'ERROR', {
      action: 'GET_INVENTORY_ALERTS',
      error: String(error)
    });
    console.error('Error fetching inventory alerts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory alerts' },
      { status: 500 }
    );
  }
}
