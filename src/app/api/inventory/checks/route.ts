import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 库存盘点管理
 * ============================================================
 *
 * @api {GET} /api/inventory/checks 获取盘点列表
 * @apiName GetInventoryChecks
 * @apiGroup INVENTORY
 * @apiDescription 获取库存盘点记录列表
 *
 * @api {POST} /api/inventory/checks 创建盘点单
 * @apiName CreateInventoryCheck
 * @apiGroup INVENTORY
 * @apiDescription 创建新的库存盘点单
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} VALIDATION_FAILED 参数验证失败
 * @apiError {String} NOT_FOUND 未找到产品
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

export async function GET(request: NextRequest) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'GET',
    path: '/api/inventory/checks'
  });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    logMonitor('INVENTORY', 'INFO', {
      action: 'GET_INVENTORY_CHECKS',
      status,
      page,
      limit
    });

    const whereConditions: string[] = [];
    const params: any[] = [];

    if (status) {
      whereConditions.push('ic.status = ?');
      params.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as count FROM inventory_checks ic ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(String(countResult.rows?.[0]?.count || 0));

    const checksQuery = `
      SELECT
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
      ${whereClause}
      ORDER BY ic.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const checksResult = await query(checksQuery, [...params, limit, offset]);
    const checks = checksResult.rows || [];

    const statsQuery = `
      SELECT
        status,
        COUNT(*) as count
      FROM inventory_checks
      GROUP BY status
    `;
    const statsResult = await query(statsQuery);
    const stats = statsResult.rows || [];

    return NextResponse.json({
      success: true,
      data: {
        checks: checks.map((c: any) => ({
          id: c.id,
          check_number: c.check_number,
          status: c.status,
          total_products: c.total_products,
          profit_count: c.profit_count,
          loss_count: c.loss_count,
          profit_quantity: c.profit_quantity,
          loss_quantity: c.loss_quantity,
          operator_id: c.operator_id,
          operator_name: c.operator_name,
          completed_at: c.completed_at,
          created_at: c.created_at,
          updated_at: c.updated_at
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
    console.error('Error fetching inventory checks:', error);
    logMonitor('INVENTORY', 'ERROR', {
      action: 'GET_INVENTORY_CHECKS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory checks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'POST',
    path: '/api/inventory/checks'
  });

  try {
    const body = await request.json();
    const { product_ids, operator_name = 'system', operator_id = null } = body;

    logMonitor('INVENTORY', 'INFO', {
      action: 'CREATE_INVENTORY_CHECK',
      productIdsCount: product_ids?.length || 0,
      operatorName: operator_name
    });

    const checkNumber = `CHK${Date.now()}${Math.floor(Math.random() * 1000)}`;

    let productsQuery = 'SELECT id, name FROM products';
    let params: any[] = [];

    if (product_ids && Array.isArray(product_ids) && product_ids.length > 0) {
      const placeholders = product_ids.map(() => '?').join(',');
      productsQuery += ` WHERE id IN (${placeholders})`;
      params = product_ids;
    }

    const productsResult = await query(productsQuery, params);
    const products = productsResult.rows || [];

    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No products found for inventory check'
      }, { status: 404 });
    }

    await query('BEGIN TRANSACTION');

    const insertResult = await query(
      `INSERT INTO inventory_checks (
        check_number, status, total_products,
        operator_id, operator_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [checkNumber, 'pending', products.length, operator_id, operator_name]
    );

    const checkId = insertResult.lastInsertRowid;

    for (const product of products) {
      const inventoryResult = await query(
        'SELECT quantity FROM inventory WHERE product_id = ?',
        [product.id]
      );
      const systemQuantity = inventoryResult.rows?.[0]?.quantity || 0;

      await query(
        `INSERT INTO inventory_check_items (
          check_id, product_id, product_name, system_quantity, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`,
        [checkId, product.id, product.name, systemQuantity]
      );
    }

    await query('COMMIT');

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'CREATE_INVENTORY_CHECK',
      checkId,
      checkNumber,
      totalProducts: products.length
    });

    return NextResponse.json({
      success: true,
      data: {
        id: checkId,
        check_number: checkNumber,
        status: 'pending',
        total_products: products.length,
        operator_name: operator_name,
        created_at: new Date().toISOString()
      },
      message: `盘点单 ${checkNumber} 创建成功，待录入实际库存`
    }, { status: 201 });

  } catch (error) {
    await query('ROLLBACK');
    console.error('Error creating inventory check:', error);
    logMonitor('INVENTORY', 'ERROR', {
      action: 'CREATE_INVENTORY_CHECK',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to create inventory check' },
      { status: 500 }
    );
  }
}
