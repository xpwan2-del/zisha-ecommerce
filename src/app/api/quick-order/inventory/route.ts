import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { createInventoryTransaction, InventoryTransactionCode } from '@/lib/inventory-transactions';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {POST} /api/quick-order/inventory 快速订单库存操作
 * @apiName QuickOrderInventory
 * @apiGroup QUICK_ORDER
 * @apiDescription 快速订单页面的库存加减操作，支持 increment/decrement。
 */


export async function POST(request: NextRequest) {
  try {
    logMonitor('INVENTORY', 'REQUEST', { method: 'POST', action: 'QUICK_ORDER_INVENTORY' });
    
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const body = await request.json();
    const { product_id, action, quantity = 1, order_id } = body;
    const userId = authResult.user.userId;

    if (!product_id || !action || !order_id) {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', { error: 'Missing product_id, action or order_id' });
      return NextResponse.json(
        { success: false, error: 'Missing product_id, action or order_id' },
        { status: 400 }
      );
    }

    if (!['increment', 'decrement'].includes(action)) {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', { error: 'Invalid action' });
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use increment or decrement' },
        { status: 400 }
      );
    }

    const orderResult = await query(
      `SELECT o.id, o.order_status, oi.quantity
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id AND oi.product_id = ?
       WHERE o.id = ? AND o.user_id = ?`,
      [product_id, order_id, userId]
    );

    if (orderResult.rows.length === 0) {
      logMonitor('INVENTORY', 'NOT_FOUND', {
        action: 'QUICK_ORDER_INVENTORY',
        orderId: order_id,
        productId: product_id,
        userId
      });
      return NextResponse.json(
        { success: false, error: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    if (order.order_status !== 'pending') {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        action: 'QUICK_ORDER_INVENTORY',
        orderId: order_id,
        productId: product_id,
        orderStatus: order.order_status,
        reason: 'ORDER_STATUS_NOT_PENDING'
      });
      return NextResponse.json(
        { success: false, error: 'INVALID_ORDER_STATUS' },
        { status: 400 }
      );
    }

    const productResult = await query(
      'SELECT p.id, p.name, i.quantity as stock FROM products p LEFT JOIN inventory i ON p.id = i.product_id WHERE p.id = ?',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = productResult.rows[0];
    const currentStock = product.stock ?? 0;

    if (action === 'increment') {
      if (currentStock <= 0) {
        return NextResponse.json(
          { success: false, error: 'OUT_OF_STOCK', message: '库存不足' },
          { status: 400 }
        );
      }

      await createInventoryTransaction({
        productId: product_id,
        productName: product.name,
        transactionTypeCode: InventoryTransactionCode.QUICK_ORDER_INCREMENT,
        quantityChange: -1,
        quantityBefore: currentStock,
        quantityAfter: currentStock - 1,
        reason: 'Quick order stock increment',
        referenceType: 'quick_order',
        referenceId: order_id,
        operatorId: userId,
        operatorName: authResult.user.name,
      });

      const updateResult = await query(
        'UPDATE inventory SET quantity = quantity - 1, updated_at = datetime("now") WHERE product_id = ? AND quantity >= 1',
        [product_id]
      );

      if (updateResult.changes === 0) {
        logMonitor('INVENTORY', 'VALIDATION_FAILED', {
          action: 'QUICK_ORDER_INVENTORY',
          operation: 'increment',
          productId: product_id,
          reason: 'CONCURRENT_CONFLICT'
        });
        return NextResponse.json(
          { success: false, error: 'OUT_OF_STOCK', message: '库存不足' },
          { status: 400 }
        );
      }

      await query(
        'UPDATE order_items SET quantity = quantity + 1 WHERE order_id = ? AND product_id = ?',
        [order_id, product_id]
      );

      logMonitor('INVENTORY', 'SUCCESS', { 
        action: 'QUICK_ORDER_INVENTORY', 
        operation: 'increment',
        productId: product_id,
        orderId: order_id,
        stockBefore: currentStock,
        stockAfter: currentStock - 1,
        orderItemQuantityAfter: Number(order.quantity || 0) + 1
      });

      return NextResponse.json({
        success: true,
        data: {
          action: 'increment',
          stock: currentStock - 1,
          quantity: Number(order.quantity || 0) + 1
        }
      });

    } else {
      if (Number(order.quantity || 0) <= 1) {
        logMonitor('INVENTORY', 'VALIDATION_FAILED', {
          action: 'QUICK_ORDER_INVENTORY',
          operation: 'decrement',
          productId: product_id,
          orderId: order_id,
          reason: 'MINIMUM_QUANTITY_REACHED'
        });
        return NextResponse.json(
          { success: false, error: 'INVALID_ACTION', message: '数量不能小于 1' },
          { status: 400 }
        );
      }

      const beforeStockResult = await query('SELECT quantity FROM inventory WHERE product_id = ?', [product_id]);
      const beforeStock = beforeStockResult.rows[0]?.quantity || 0;

      await createInventoryTransaction({
        productId: product_id,
        productName: product.name,
        transactionTypeCode: InventoryTransactionCode.QUICK_ORDER_DECREMENT,
        quantityChange: 1,
        quantityBefore: beforeStock,
        quantityAfter: beforeStock + 1,
        reason: 'Quick order stock decrement',
        referenceType: 'quick_order',
        referenceId: order_id,
        operatorId: userId,
        operatorName: authResult.user.name,
      });

      await query(
        'UPDATE inventory SET quantity = quantity + 1, updated_at = datetime("now") WHERE product_id = ?',
        [product_id]
      );

      await query(
        'UPDATE order_items SET quantity = quantity - 1 WHERE order_id = ? AND product_id = ?',
        [order_id, product_id]
      );

      logMonitor('INVENTORY', 'SUCCESS', { 
        action: 'QUICK_ORDER_INVENTORY', 
        operation: 'decrement',
        productId: product_id,
        orderId: order_id,
        stockBefore: beforeStock,
        stockAfter: beforeStock + 1,
        orderItemQuantityAfter: Number(order.quantity || 0) - 1
      });

      return NextResponse.json({
        success: true,
        data: {
          action: 'decrement',
          stock: beforeStock + 1,
          quantity: Number(order.quantity || 0) - 1
        }
      });
    }

  } catch (error: any) {
    logMonitor('INVENTORY', 'ERROR', { action: 'QUICK_ORDER_INVENTORY', error: error?.message || String(error) });
    console.error('Error in quick-order inventory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}