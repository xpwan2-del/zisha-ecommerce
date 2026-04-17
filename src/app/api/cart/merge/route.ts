import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getMessage, getMessageWithParams } from '@/lib/messages';

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

export async function POST(request: NextRequest) {
  try {
    const lang = getLangFromRequest(request);

    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const data = await request.json();
    const { guest_cart } = data;

    if (!guest_cart || !Array.isArray(guest_cart)) {
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

      // 检查商品是否已在购物车中
      const existingItem = await query(
        'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
        [user_id, product_id]
      );

      if (existingItem.rows.length > 0) {
        // 已存在商品 - 需要计算额外需要锁定的库存
        const currentCartQty = existingItem.rows[0].quantity;
        const additionalQty = quantity; // 游客购物车带来的新数量

        // 检查额外数量是否足够
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

        // 锁定额外库存
        if (additionalQty > 0) {
          const lockResult = await query(
            `UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND quantity >= ?`,
            [additionalQty, product_id, additionalQty]
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

          // 记录库存流水
          await query(
            `INSERT INTO inventory_transactions (
              product_id, product_name, transaction_type, quantity_change,
              quantity_before, quantity_after, reason, reference_type, reference_id,
              operator_id, operator_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              product_id,
              product.name || `Product #${product_id}`,
              'sale',
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

        // 更新购物车数量
        await query(
          'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
          [additionalQty, existingItem.rows[0].id]
        );
        mergedCount++;
      } else {
        // 新增商品
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

        // 锁定库存
        const lockResult = await query(
          `UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND quantity >= ?`,
          [quantity, product_id, quantity]
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

        // 记录库存流水
        await query(
          `INSERT INTO inventory_transactions (
            product_id, product_name, transaction_type, quantity_change,
            quantity_before, quantity_after, reason, reference_type, reference_id,
            operator_id, operator_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product_id,
            product.name || `Product #${product_id}`,
            'sale',
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

        // 添加新商品到购物车
        await query(
          'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
          [user_id, product_id, quantity]
        );
        mergedCount++;
      }
    }

    if (failedItems.length > 0) {
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

    return NextResponse.json({
      success: true,
      message: getMessage('CART_MERGE_SUCCESS', lang),
      message_en: getMessage('CART_MERGE_SUCCESS', 'en'),
      message_ar: getMessage('CART_MERGE_SUCCESS', 'ar'),
      merged_count: mergedCount,
    });
  } catch (error) {
    console.error('Error merging cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to merge cart' },
      { status: 500 }
    );
  }
}
