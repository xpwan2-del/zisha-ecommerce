import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 辅助函数：计算库存状态ID
function calculateStatusId(quantity: number): number {
  if (quantity <= 0) return 4;
  if (quantity <= 5) return 3;
  if (quantity <= 10) return 2;
  return 1;
}

// GET /api/inventory - Get inventory list and transactions
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('product_id');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let whereClause = '';
    const params: any[] = [];

    if (productId) {
      whereClause = 'WHERE it.product_id = ?';
      params.push(productId);
    }

    const offset = (page - 1) * limit;

    // 查询库存流水记录（从 inventory_transactions 表）
    const logsQuery = `
      SELECT
        it.id,
        it.product_id,
        it.product_name,
        it.transaction_type,
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
      ${whereClause}
      ORDER BY it.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const logsResult = await query(logsQuery, [...params, limit, offset]);
    const logs = logsResult.rows || [];

    // 查询总数
    const countQuery = `SELECT COUNT(*) as count FROM inventory_transactions it ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(String(countResult.rows?.[0]?.count || 0));

    // 查询库存统计（从 inventory 表）
    const statsQuery = `
      SELECT
        COUNT(*) as total_products,
        SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) as sufficient_stock,
        SUM(CASE WHEN status = 'limited' THEN 1 ELSE 0 END) as limited_stock,
        SUM(CASE WHEN status = 'low_stock' THEN 1 ELSE 0 END) as low_stock,
        SUM(CASE WHEN status = 'out_of_stock' THEN 1 ELSE 0 END) as out_of_stock,
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
          transaction_type: log.transaction_type,
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
    return NextResponse.json(
      { success: false, error: 'Failed to get inventory' },
      { status: 500 }
    );
  }
}

// POST /api/inventory - Adjust inventory
export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { success: false, error: 'Missing required fields: product_id, change_type, quantity' },
        { status: 400 }
      );
    }

    // 获取当前库存
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

    // 获取产品名称
    const productResult = await query('SELECT name FROM products WHERE id = ?', [product_id]);
    const productName = productResult.rows[0]?.name || 'Product';

    // 计算新库存和变动数量
    let newQuantity = currentQuantity;
    let quantityChange = 0;
    let transactionType = change_type;

    switch (change_type) {
      case 'increase':
        newQuantity = currentQuantity + quantity;
        quantityChange = quantity;
        transactionType = 'adjustment_in';
        break;
      case 'decrease':
        newQuantity = Math.max(0, currentQuantity - quantity);
        quantityChange = -quantity;
        transactionType = 'adjustment_out';
        break;
      case 'set':
        quantityChange = quantity - currentQuantity;
        newQuantity = quantity;
        transactionType = quantityChange >= 0 ? 'adjustment_in' : 'adjustment_out';
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid change_type. Use: increase, decrease, set' },
          { status: 400 }
        );
    }

    // 更新 inventory 表
    await query(
      'UPDATE inventory SET quantity = ?, status_id = ?, updated_at = datetime("now") WHERE product_id = ?',
      [newQuantity, calculateStatusId(newQuantity), product_id]
    );

    // 记录库存流水
    const logResult = await query(
      `INSERT INTO inventory_transactions (
        product_id, product_name, transaction_type, quantity_change,
        quantity_before, quantity_after, reason, reference_type, reference_id,
        operator_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      RETURNING id`,
      [
        product_id,
        productName,
        transactionType,
        quantityChange,
        currentQuantity,
        newQuantity,
        reason || 'Manual adjustment',
        'adjustment',
        null,
        operator_name
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: logResult.rows[0]?.id,
        product_id,
        product_name: productName,
        transaction_type: transactionType,
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
    return NextResponse.json(
      { success: false, error: 'Failed to adjust inventory' },
      { status: 500 }
    );
  }
}
