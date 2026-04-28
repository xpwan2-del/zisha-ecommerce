import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 库存状态查询
 * ============================================================
 *
 * @api {GET} /api/inventory/status 查询库存状态
 * @apiName GetInventoryStatus
 * @apiGroup INVENTORY
 * @apiDescription 根据商品ID列表批量查询库存状态
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} VALIDATION_FAILED 参数验证失败
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

export async function GET(request: NextRequest) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'GET',
    path: '/api/inventory/status'
  });

  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        reason: 'Missing required parameter: ids'
      });
      return NextResponse.json(
        { success: false, error: 'Missing ids parameter' },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    if (ids.length === 0) {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        reason: 'Invalid ids parameter',
        idsParam
      });
      return NextResponse.json(
        { success: false, error: 'Invalid ids parameter' },
        { status: 400 }
      );
    }

    logMonitor('INVENTORY', 'INFO', {
      action: 'GET_INVENTORY_STATUS',
      productIds: ids,
      count: ids.length
    });

    const placeholders = ids.map(() => '?').join(',');

    const result = await query(`
      SELECT
        i.product_id as id,
        COALESCE(i.quantity, 0) as stock,
        i.status_id as stock_status_id,
        ins.id as status_id,
        ins.name as status_name,
        ins.name_en as status_name_en,
        ins.name_ar as status_name_ar,
        ins.color as status_color,
        ins.color_name as status_color_name
      FROM inventory i
      LEFT JOIN inventory_status ins ON i.status_id = ins.id
      WHERE i.product_id IN (${placeholders})
    `, ids);

    const data = (result.rows || []).map((row: any) => ({
      id: row.id,
      stock: parseInt(row.stock) || 0,
      stock_status_id: row.stock_status_id || 1,
      stock_status_info: row.status_id ? {
        id: row.status_id,
        name: row.status_name,
        name_en: row.status_name_en,
        name_ar: row.status_name_ar,
        color: row.status_color,
        color_name: row.status_color_name
      } : null
    }));

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'GET_INVENTORY_STATUS',
      productIds: ids,
      count: data.length
    });

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching inventory status:', error);
    logMonitor('INVENTORY', 'ERROR', {
      action: 'GET_INVENTORY_STATUS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}