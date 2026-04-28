import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 库存初始化
 * ============================================================
 *
 * @api {POST} /api/inventory/init 初始化库存
 * @apiName InitInventory
 * @apiGroup INVENTORY
 * @apiDescription 为商品初始化库存记录（后台管理）
 *
 * @api {GET} /api/inventory/init 获取库存详情
 * @apiName GetInventoryInit
 * @apiGroup INVENTORY
 * @apiDescription 根据商品ID获取库存详情和最近流水
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

function calculateStatusId(quantity: number): number {
  if (quantity <= 0) return 4;
  if (quantity <= 5) return 3;
  if (quantity <= 10) return 2;
  return 1;
}

export async function POST(request: NextRequest) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'POST',
    path: '/api/inventory/init'
  });

  try {
    const body = await request.json().catch(() => ({}));
    const { product_ids, operator_name = 'system' } = body;

    logMonitor('INVENTORY', 'INFO', {
      action: 'INIT_INVENTORY',
      productIdsCount: product_ids?.length || 'all',
      operatorName: operator_name
    });

    let productsQuery = 'SELECT id, name, stock FROM products';
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
        error: 'No products found to initialize'
      }, { status: 404 });
    }

    await query('BEGIN TRANSACTION');

    let initializedCount = 0;
    let skippedCount = 0;
    const results: any[] = [];

    for (const product of products) {
      const productId = product.id;
      const productName = product.name;
      const stock = parseInt(product.stock) || 0;

      const existingResult = await query(
        'SELECT id, quantity FROM inventory WHERE product_id = ?',
        [productId]
      );

      if (existingResult.rows && existingResult.rows.length > 0) {
        skippedCount++;
        continue;
      }

      const statusId = calculateStatusId(stock);

      await query(
        `INSERT INTO inventory (product_id, product_name, quantity, status_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [productId, productName, stock, statusId]
      );

      const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['self_estock']);
      const transactionTypeId = typeResult.rows[0]?.id || 14;

      await query(
        `INSERT INTO inventory_transactions (
          product_id, product_name, transaction_type_id, quantity_change,
          quantity_before, quantity_after, reason, reference_type,
          operator_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [productId, productName, transactionTypeId, stock, 0, stock, '库存初始化', 'init', operator_name]
      );

      results.push({
        product_id: productId,
        product_name: productName,
        quantity: stock,
        status_id: statusId
      });

      initializedCount++;
    }

    await query('COMMIT');

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'INIT_INVENTORY',
      initializedCount,
      skippedCount,
      totalProducts: products.length
    });

    return NextResponse.json({
      success: true,
      data: {
        initialized_count: initializedCount,
        skipped_count: skippedCount,
        total_products: products.length,
        results: results
      },
      message: `成功初始化 ${initializedCount} 个产品的库存，${skippedCount} 个已存在被跳过`
    }, { status: 201 });

  } catch (error) {
    await query('ROLLBACK');
    console.error('Error initializing inventory:', error);
    logMonitor('INVENTORY', 'ERROR', {
      action: 'INIT_INVENTORY',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to initialize inventory' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  logMonitor('INVENTORY', 'REQUEST', {
    method: 'GET',
    path: '/api/inventory/init'
  });

  try {
    const { searchParams } = new URL(request.url);
    const product_id = searchParams.get('product_id');

    if (!product_id) {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        reason: 'Missing required parameter: product_id'
      });
      return NextResponse.json({
        success: false,
        error: 'Product ID is required'
      }, { status: 400 });
    }

    logMonitor('INVENTORY', 'INFO', {
      action: 'GET_INVENTORY_DETAIL',
      productId: product_id
    });

    const result = await query(
      `SELECT
        i.*,
        p.name as product_name,
        p.image as product_image
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.product_id = ?`,
      [product_id]
    );

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Inventory not found for this product'
      }, { status: 404 });
    }

    const inventory = result.rows[0];

    const transactionResult = await query(
      `SELECT
        id, transaction_type_id, quantity_change,
        quantity_before, quantity_after, reason,
        reference_type, reference_id, operator_name, created_at
       FROM inventory_transactions
       WHERE product_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [product_id]
    );

    return NextResponse.json({
      success: true,
      data: {
        inventory: {
          product_id: inventory.product_id,
          product_name: inventory.product_name,
          product_image: inventory.product_image,
          quantity: inventory.quantity,
          low_stock_threshold: inventory.low_stock_threshold,
          status: inventory.status,
          created_at: inventory.created_at,
          updated_at: inventory.updated_at
        },
        recent_transactions: transactionResult.rows || []
      }
    });

  } catch (error) {
    console.error('Error getting inventory:', error);
    logMonitor('INVENTORY', 'ERROR', {
      action: 'GET_INVENTORY_DETAIL',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to get inventory' },
      { status: 500 }
    );
  }
}
