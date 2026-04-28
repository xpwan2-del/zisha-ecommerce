import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 库存流水参考类型查询
 * ============================================================
 *
 * @api {GET} /api/inventory/reference-types 获取参考类型列表
 * @apiName GetReferenceTypes
 * @apiGroup INVENTORY
 * @apiDescription 获取库存流水的参考类型列表
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

export async function GET(request: NextRequest) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'GET',
    path: '/api/inventory/reference-types'
  });

  try {
    logMonitor('INVENTORY', 'INFO', {
      action: 'GET_REFERENCE_TYPES'
    });

    const typesQuery = `
      SELECT
        id,
        code,
        name,
        name_en,
        description,
        created_at
      FROM reference_types
      ORDER BY id ASC
    `;

    const result = await query(typesQuery);
    const types = result.rows || [];

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'GET_REFERENCE_TYPES',
      count: types.length
    });

    return NextResponse.json({
      success: true,
      data: types.map((t: any) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        name_en: t.name_en,
        description: t.description,
        created_at: t.created_at
      }))
    });

  } catch (error) {
    console.error('Error fetching reference types:', error);
    logMonitor('INVENTORY', 'ERROR', {
      action: 'GET_REFERENCE_TYPES',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reference types' },
      { status: 500 }
    );
  }
}
