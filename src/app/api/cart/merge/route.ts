import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getMessage, getMessageWithParams } from '@/lib/messages';
import { logMonitor } from '@/lib/utils/logger';

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

export async function POST(request: NextRequest) {
  try {
    logMonitor('CART', 'REQUEST', { method: 'POST', action: 'MERGE_CART' });
    
    const lang = getLangFromRequest(request);

    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const data = await request.json();
    const { guest_cart } = data;

    if (!guest_cart || !Array.isArray(guest_cart)) {
      logMonitor('CART', 'VALIDATION_FAILED', { error: 'Invalid guest cart data' });
      return NextResponse.json(
        { success: false, error: 'Invalid guest cart data' },
        { status: 400 }
      );
    }

    const user_id = authResult.user?.userId;

    const failedItems: Array<{
      product_id: number;
      product_name: string;
      requested: number;
      available: number;
      reason: string;
    }> = [];
    let mergedCount = 0;

    for (const item of guest_cart) {
      const { product_id, quantity } = item;

      const productResult = await query(
        `SELECT p.id, p.name, COALESCE(i.quantity, 0) as stock
         FROM products p
         LEFT JOIN inventory i ON p.id = i.product_id
         WHERE p.id = ?`,
        [product_id]
      );
      if (productResult.rows.length === 0) {
        failedItems.push({
          product_id,
          product_name: `Product #${product_id}`,
          requested: quantity,
          available: 0,
          reason: getMessage('PRODUCT_NOT_FOUND', lang),
        });
        continue;
      }

      const product = productResult.rows[0];
      const availableStock = product.stock || 0;

      const existingItem = await query(
        'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
        [user_id, product_id]
      );

      if (existingItem.rows.length > 0) {
        const currentCartQty = existingItem.rows[0].quantity;
        const additionalQty = quantity;

        if (additionalQty > availableStock) {
          failedItems.push({
            product_id,
            product_name: product.name || `Product #${product_id}`,
            requested: additionalQty,
            available: availableStock,
            reason: getMessageWithParams('INSUFFICIENT_STOCK', lang, { requested: additionalQty, available: availableStock }),
          });
          continue;
        }

        if (additionalQty > 0) {
          const finalQty = existingItem.rows[0].quantity + additionalQty;
          const lockResult = await query(
            `UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND quantity >= ?`,
            [finalQty, product_id, finalQty]
          );

          if (!lockResult.changes || lockResult.changes === 0) {
            failedItems.push({
              product_id,
              product_name: product.name || `Product #${product_id}`,
              requested: additionalQty,
              available: availableStock,
              reason: getMessage('OUT_OF_STOCK', lang),
            });
            continue;
          }

          const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['cat_increase']);
          const transactionTypeId = typeResult.rows[0]?.id || 8;

          await query(
            `INSERT INTO inventory_transactions (
              product_id, product_name, transaction_type_id, quantity_change,
              quantity_before, quantity_after, reason, reference_type, reference_id,
              operator_id, operator_name, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
              product_id,
              product.name || `Product #${product_id}`,
              transactionTypeId,
              -additionalQty,
              availableStock,
              availableStock - additionalQty,
              `Merged from guest cart`,
              'cart_merge',
              existingItem.rows[0].id,
              user_id,
              authResult.user?.name || 'User'
            ]
          );
        }

        await query(
          'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
          [additionalQty, existingItem.rows[0].id]
        );
        mergedCount++;
      } else {
        if (quantity > availableStock) {
          failedItems.push({
            product_id,
            product_name: product.name || `Product #${product_id}`,
            requested: quantity,
            available: availableStock,
            reason: getMessageWithParams('INSUFFICIENT_STOCK', lang, { requested: quantity, available: availableStock }),
          });
          continue;
        }

        const lockResult = await query(
          `UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND quantity >= (SELECT quantity FROM inventory WHERE product_id = ?)`,
          [quantity, product_id, product_id]
        );

        if (!lockResult.changes || lockResult.changes === 0) {
          failedItems.push({
            product_id,
            product_name: product.name || `Product #${product_id}`,
            requested: quantity,
            available: availableStock,
            reason: getMessage('OUT_OF_STOCK', lang),
          });
          continue;
        }

        const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['cat_increase']);
        const transactionTypeId = typeResult.rows[0]?.id || 8;

        await query(
          `INSERT INTO inventory_transactions (
            product_id, product_name, transaction_type_id, quantity_change,
            quantity_before, quantity_after, reason, reference_type, reference_id,
            operator_id, operator_name, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            product_id,
            product.name || `Product #${product_id}`,
            transactionTypeId,
            -quantity,
            availableStock,
            availableStock - quantity,
            `Added from guest cart merge`,
            'cart_merge',
            product_id,
            user_id,
            authResult.user?.name || 'User'
          ]
        );

        await query(
          'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
          [user_id, product_id, quantity]
        );
        mergedCount++;
      }
    }

    if (failedItems.length > 0) {
      logMonitor('CART', 'PARTIAL_SUCCESS', { mergedCount, failedCount: failedItems.length });
      return NextResponse.json({
        success: true,
        warning: true,
        message: getMessage('CART_MERGE_PARTIAL', lang),
        message_en: getMessage('CART_MERGE_PARTIAL', 'en'),
        message_ar: getMessage('CART_MERGE_PARTIAL', 'ar'),
        merged_count: mergedCount,
        failed_items: failedItems,
      });
    }

    logMonitor('CART', 'SUCCESS', { action: 'MERGE_CART', mergedCount });
    
    return NextResponse.json({
      success: true,
      message: getMessage('CART_MERGE_SUCCESS', lang),
      message_en: getMessage('CART_MERGE_SUCCESS', 'en'),
      message_ar: getMessage('CART_MERGE_SUCCESS', 'ar'),
      merged_count: mergedCount,
    });
  } catch (error: any) {
    logMonitor('CART', 'ERROR', { action: 'MERGE_CART', error: error?.message || String(error) });
    console.error('Error merging cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to merge cart' },
      { status: 500 }
    );
  }
}