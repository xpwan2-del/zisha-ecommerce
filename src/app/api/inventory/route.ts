import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/inventory - Get inventory list with product info
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('product_id');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let whereClause = '';
    const params: any[] = [];

    if (productId) {
      whereClause = 'WHERE il.product_id = ?';
      params.push(productId);
    }

    const offset = (page - 1) * limit;

    // 查询库存变动记录
    const logsQuery = `
      SELECT
        il.id, il.product_id,
        il.change_type, il.quantity,
        il.before_stock, il.after_stock,
        il.reason, il.operator_name,
        il.created_at,
        p.name as product_name,
        p.image as product_image
      FROM inventory_logs il
      JOIN products p ON il.product_id = p.id
      ${whereClause}
      ORDER BY il.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const logsResult = await query(logsQuery, [...params, limit, offset]);
    const logs = logsResult.rows || [];

    // 查询总数
    const countQuery = `SELECT COUNT(*) as count FROM inventory_logs il ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(String(countResult.rows?.[0]?.count || 0));

    // 查询产品库存统计
    const statsQuery = `
      SELECT
        COUNT(*) as total_products,
        SUM(CASE WHEN stock > 20 THEN 1 ELSE 0 END) as sufficient_stock,
        SUM(CASE WHEN stock > 0 AND stock <= 20 THEN 1 ELSE 0 END) as limited_stock,
        SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(stock) as total_stock
      FROM products
    `;
    const statsResult = await query(statsQuery);
    const stats = statsResult.rows?.[0] || {};

    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map((log: any) => ({
          ...log,
          quantity: parseInt(log.quantity),
          before_stock: parseInt(log.before_stock),
          after_stock: parseInt(log.after_stock)
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
          out_of_stock: parseInt(stats.out_of_stock) || 0,
          total_stock: parseInt(stats.total_stock) || 0
        }
      }
    });

  } catch (error) {
    console.error('Error getting inventory logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get inventory logs' },
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
    const productResult = await query(
      'SELECT stock, name FROM products WHERE id = ?',
      [product_id]
    );

    if (!productResult.rows || productResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const currentStock = parseInt(productResult.rows[0].stock) || 0;
    const productName = productResult.rows[0].name;

    // 计算新库存
    let newStock = currentStock;
    let actualQuantity = quantity;

    switch (change_type) {
      case 'increase':
        newStock = currentStock + quantity;
        break;
      case 'decrease':
        newStock = Math.max(0, currentStock - quantity);
        actualQuantity = -quantity;
        break;
      case 'set':
        newStock = quantity;
        actualQuantity = quantity - currentStock;
        break;
      case 'adjust':
        newStock = currentStock + quantity;
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid change_type. Use: increase, decrease, set, adjust' },
          { status: 400 }
        );
    }

    // 更新产品库存
    await query(
      'UPDATE products SET stock = ?, updated_at = datetime("now") WHERE id = ?',
      [newStock, product_id]
    );

    // 记录库存变动日志
    const logResult = await query(
      `INSERT INTO inventory_logs (
        product_id, change_type, quantity,
        before_stock, after_stock, reason, operator_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      RETURNING id`,
      [
        product_id,
        change_type,
        actualQuantity,
        currentStock,
        newStock,
        reason || '库存调整',
        operator_name
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        log_id: logResult.rows[0]?.id,
        product_id,
        product_name: productName,
        change_type,
        quantity: actualQuantity,
        before_stock: currentStock,
        after_stock: newStock,
        reason,
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
