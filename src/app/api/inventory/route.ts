import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 库存管理
 * ============================================================
 *
 * @api {GET} /api/inventory 获取库存流水和统计
 * @apiName GetInventory
 * @apiGroup INVENTORY
 * @apiDescription 获取库存流水记录和库存统计信息
 *
 * @api {POST} /api/inventory 手动调整库存
 * @apiName AdjustInventory
 * @apiGroup INVENTORY
 * @apiDescription 手动增加、减少或设置库存（后台管理）
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} VALIDATION_FAILED 参数验证失败
 * @apiError {String} NOT_FOUND 库存记录不存在
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

function calculateStatusId(quantity: number): number {
  if (quantity <= 0) return 4;
  if (quantity <= 5) return 3;
  if (quantity <= 10) return 2;
  return 1;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const productId = url.searchParams.get('product_id');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  logMonitor('INVENTORY', 'REQUEST', {
    method: 'GET',
    path: '/api/inventory',
    query: { productId, page, limit }
  });

  try {
    logMonitor('INVENTORY', 'INFO', {
      action: 'GET_INVENTORY_TRANSACTIONS',
      productId,
      page,
      limit
    });

    let whereClause = '';
    const params: any[] = [];

    if (productId) {
      whereClause = 'WHERE it.product_id = ?';
      params.push(productId);
    }

    const offset = (page - 1) * limit;

    const logsQuery = `
      SELECT
        it.id,
        it.product_id,
        it.product_name,
        it.transaction_type_id,
        tt.code as transaction_code,
        tt.name_zh as transaction_name_zh,
        tt.name_en as transaction_name_en,
        tt.name_ar as transaction_name_ar,
        it.quantity_change,
        it.quantity_before,
        it.quantity_after,
        it.reason,
        it.reference_type,
        it.reference_id,
        it.operator_name,
        it.created_at,
        p.image as product_image
      FROM inventory_transactions it
      JOIN products p ON it.product_id = p.id
      LEFT JOIN transaction_type tt ON it.transaction_type_id = tt.id
      ${whereClause}
      ORDER BY it.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const logsResult = await query(logsQuery, [...params, limit, offset]);
    const logs = logsResult.rows || [];

    const countQuery = `SELECT COUNT(*) as count FROM inventory_transactions it ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(String(countResult.rows?.[0]?.count || 0));

    const statsQuery = `
      SELECT
        COUNT(*) as total_products,
        SUM(CASE WHEN status_id = 1 THEN 1 ELSE 0 END) as sufficient_stock,
        SUM(CASE WHEN status_id = 2 THEN 1 ELSE 0 END) as limited_stock,
        SUM(CASE WHEN status_id = 3 THEN 1 ELSE 0 END) as low_stock,
        SUM(CASE WHEN status_id = 4 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(quantity) as total_stock
      FROM inventory
    `;
    const statsResult = await query(statsQuery);
    const stats = statsResult.rows?.[0] || {};

    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map((log: any) => ({
          id: log.id,
          product_id: log.product_id,
          product_name: log.product_name,
          product_image: log.product_image,
          transaction_type_id: log.transaction_type_id,
          transaction_code: log.transaction_code,
          transaction_name_zh: log.transaction_name_zh,
          transaction_name_en: log.transaction_name_en,
          transaction_name_ar: log.transaction_name_ar,
          quantity_change: log.quantity_change,
          quantity_before: log.quantity_before,
          quantity_after: log.quantity_after,
          reason: log.reason,
          reference_type: log.reference_type,
          reference_id: log.reference_id,
          operator_name: log.operator_name,
          created_at: log.created_at
        })),
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        },
        stats: {
          total_products: parseInt(stats.total_products) || 0,
          sufficient_stock: parseInt(stats.sufficient_stock) || 0,
          limited_stock: parseInt(stats.limited_stock) || 0,
          low_stock: parseInt(stats.low_stock) || 0,
          out_of_stock: parseInt(stats.out_of_stock) || 0,
          total_stock: parseInt(stats.total_stock) || 0
        }
      }
    });

  } catch (error) {
    console.error('Error getting inventory:', error);
    logMonitor('INVENTORY', 'ERROR', {
      action: 'GET_INVENTORY_TRANSACTIONS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to get inventory' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'POST',
    path: '/api/inventory'
  });

  try {
    const body = await request.json();
    const {
      product_id,
      change_type,
      quantity,
      reason,
      operator_name = 'system'
    } = body;

    if (!product_id || !change_type || quantity === undefined) {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        reason: 'Missing required fields',
        required: ['product_id', 'change_type', 'quantity']
      });
      return NextResponse.json(
        { success: false, error: 'Missing required fields: product_id, change_type, quantity' },
        { status: 400 }
      );
    }

    logMonitor('INVENTORY', 'INFO', {
      action: 'ADJUST_INVENTORY',
      productId: product_id,
      changeType: change_type,
      quantity
    });

    const inventoryResult = await query(
      'SELECT quantity FROM inventory WHERE product_id = ?',
      [product_id]
    );

    if (!inventoryResult.rows || inventoryResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product inventory not found. Please initialize inventory first.' },
        { status: 404 }
      );
    }

    const currentQuantity = inventoryResult.rows[0].quantity || 0;

    const productResult = await query('SELECT name FROM products WHERE id = ?', [product_id]);
    const productName = productResult.rows[0]?.name || 'Product';

    let newQuantity = currentQuantity;
    let quantityChange = 0;
    let transactionTypeCode = change_type;

    switch (change_type) {
      case 'increase':
        newQuantity = currentQuantity + quantity;
        quantityChange = quantity;
        transactionTypeCode = 'stock_gain';
        break;
      case 'decrease':
        newQuantity = Math.max(0, currentQuantity - quantity);
        quantityChange = -quantity;
        transactionTypeCode = 'stock_lose';
        break;
      case 'set':
        quantityChange = quantity - currentQuantity;
        newQuantity = quantity;
        transactionTypeCode = quantityChange >= 0 ? 'stock_gain' : 'stock_lose';
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid change_type. Use: increase, decrease, set' },
          { status: 400 }
        );
    }

    await query(
      'UPDATE inventory SET quantity = ?, status_id = ?, updated_at = datetime("now") WHERE product_id = ?',
      [newQuantity, calculateStatusId(newQuantity), product_id]
    );

    let transactionTypeId = 13;
    if (transactionTypeCode === 'stock_gain') {
      const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['stock_gain']);
      transactionTypeId = typeResult.rows[0]?.id || 11;
    } else if (transactionTypeCode === 'stock_lose') {
      const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['stock_lose']);
      transactionTypeId = typeResult.rows[0]?.id || 12;
    }

    const insertResult = await query(
      `INSERT INTO inventory_transactions (
        product_id, product_name, transaction_type_id, quantity_change,
        quantity_before, quantity_after, reason, reference_type, reference_id,
        operator_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        product_id,
        productName,
        transactionTypeId,
        quantityChange,
        currentQuantity,
        newQuantity,
        reason || 'Manual adjustment',
        'adjustment',
        null,
        operator_name
      ]
    );

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'ADJUST_INVENTORY',
      productId: product_id,
      productName,
      transactionTypeCode,
      quantityChange,
      quantityBefore: currentQuantity,
      quantityAfter: newQuantity
    });

    return NextResponse.json({
      success: true,
      data: {
        id: insertResult.lastInsertRowid,
        product_id,
        product_name: productName,
        transaction_type_id: transactionTypeId,
        transaction_code: transactionTypeCode,
        quantity_change: quantityChange,
        quantity_before: currentQuantity,
        quantity_after: newQuantity,
        status_id: calculateStatusId(newQuantity),
        reason: reason || 'Manual adjustment',
        operator_name
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error adjusting inventory:', error);
    logMonitor('INVENTORY', 'ERROR', {
      action: 'ADJUST_INVENTORY',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to adjust inventory' },
      { status: 500 }
    );
  }
}