import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    logMonitor('INVENTORY', 'REQUEST', { method: 'POST', action: 'QUICK_ORDER_INVENTORY' });
    
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const body = await request.json();
    const { product_id, action, quantity = 1 } = body;
    const userId = authResult.user.userId;

    if (!product_id || !action) {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', { error: 'Missing product_id or action' });
      return NextResponse.json(
        { success: false, error: 'Missing product_id or action' },
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

    const productResult = await query(
      'SELECT p.id, p.name, p.price, i.quantity as stock FROM products p LEFT JOIN inventory i ON p.id = i.product_id WHERE p.id = ?',
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

      const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['sales_increase']);
      const transactionTypeId = typeResult.rows[0]?.id || 2;

      await query(
        `INSERT INTO inventory_transactions (
          product_id, product_name, transaction_type_id, quantity_change,
          quantity_before, quantity_after, reason, reference_type, reference_id,
          operator_id, operator_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          product_id,
          product.name,
          transactionTypeId,
          1,
          currentStock,
          currentStock - 1,
          'Quick order stock increment',
          'quick_order',
          null,
          userId,
          authResult.user.name || 'User'
        ]
      );

      await query(
        'UPDATE inventory SET quantity = quantity - 1, updated_at = datetime("now") WHERE product_id = ?',
        [product_id]
      );

      logMonitor('INVENTORY', 'SUCCESS', { 
        action: 'QUICK_ORDER_INVENTORY', 
        operation: 'increment',
        productId: product_id,
        stockBefore: currentStock,
        stockAfter: currentStock - 1
      });

      return NextResponse.json({
        success: true,
        data: {
          action: 'increment',
          stock: currentStock - 1
        }
      });

    } else {
      const beforeStockResult = await query('SELECT quantity FROM inventory WHERE product_id = ?', [product_id]);
      const beforeStock = beforeStockResult.rows[0]?.quantity || 0;

      const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['sales_reduce']);
      const transactionTypeId = typeResult.rows[0]?.id || 3;

      await query(
        `INSERT INTO inventory_transactions (
          product_id, product_name, transaction_type_id, quantity_change,
          quantity_before, quantity_after, reason, reference_type, reference_id,
          operator_id, operator_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          product_id,
          product.name,
          transactionTypeId,
          1,
          beforeStock,
          beforeStock + 1,
          'Quick order stock decrement',
          'quick_order',
          null,
          userId,
          authResult.user.name || 'User'
        ]
      );

      await query(
        'UPDATE inventory SET quantity = quantity + 1, updated_at = datetime("now") WHERE product_id = ?',
        [product_id]
      );

      logMonitor('INVENTORY', 'SUCCESS', { 
        action: 'QUICK_ORDER_INVENTORY', 
        operation: 'decrement',
        productId: product_id,
        stockBefore: beforeStock,
        stockAfter: beforeStock + 1
      });

      return NextResponse.json({
        success: true,
        data: {
          action: 'decrement',
          stock: beforeStock + 1
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