import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getMessage, getMessageWithParams } from '@/lib/messages';

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

function createErrorResponse(key: string, lang: string, status: number = 400) {
  return NextResponse.json(
    {
      success: false,
      error_code: key,
      message: getMessage(key as any, lang),
      message_en: getMessage(key as any, 'en'),
      message_ar: getMessage(key as any, 'ar'),
    },
    { status }
  );
}

function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

function calculateStockStatus(quantity: number): number {
  if (quantity <= 0) return 4;
  if (quantity <= 5) return 3;
  if (quantity <= 10) return 2;
  return 1;
}

// GET /api/cart - Get cart items
export async function GET(request: NextRequest) {
  try {
    const lang = getLangFromRequest(request);

    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const user_id = authResult.user?.userId;

    const result = await query(
      `SELECT
        c.id,
        c.product_id,
        c.quantity,
        c.created_at,
        p.name,
        p.name_en,
        p.name_ar,
        p.price as original_price,
        p.image,
        COALESCE(i.quantity, 0) as stock,
        i.status_id as stock_status_id
      FROM cart_items c
      LEFT JOIN products p ON c.product_id = p.id
      LEFT JOIN inventory i ON c.product_id = i.product_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC`,
      [user_id]
    );

    // 获取所有商品ID
    const productIds = result.rows.map((row: any) => row.product_id);

    // 批量查询促销信息（一次性查询，避免 Promise.all 问题）
    // 修改：支持多促销，添加 can_stack 和 priority 字段
    let promotionsMap: Record<number, any[]> = {};
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',');
      const promoQuery = await query(
        `SELECT
          pp.product_id,
          pp.original_price as promo_original_price,
          pr.id as promotion_id,
          pr.name as promotion_name,
          pr.name_en as promotion_name_en,
          pr.name_ar as promotion_name_ar,
          pr.discount_percent,
          pr.color as promotion_color,
          pp.end_time,
          pp.can_stack,
          pp.priority
        FROM product_promotions pp
        JOIN promotions pr ON pp.promotion_id = pr.id
        WHERE pp.product_id IN (${placeholders})
          AND pp.end_time > datetime('now') AND datetime(pp.start_time) <= datetime('now')`,
        productIds
      );

      // 建立 product_id -> promotions 数组的映射
      for (const promo of promoQuery.rows) {
        if (!promotionsMap[promo.product_id]) {
          promotionsMap[promo.product_id] = [];
        }
        promotionsMap[promo.product_id].push(promo);
      }
    }

    let total = 0;
    let total_items = 0;
    const items = result.rows.map((item: any) => {
      let currentPrice = parseFloat(item.original_price) || 0;
      let promotion = null;
      let promotions: any[] = [];

      // 检查是否有有效促销（现在是数组）
      const promos = promotionsMap[item.product_id] || [];
      if (promos.length > 0) {
        // 计算总折扣和最终价格（使用正确的叠加逻辑）
        // 1. 检查是否有独占促销 (can_stack === 1)
        const exclusive = promos.find((p: any) => p.can_stack === 1);
        let totalDiscountPercent = 0;
        let finalPrice = parseFloat(item.original_price) || 0;

        if (exclusive) {
          // 有独占：直接用独占促销的折扣
          totalDiscountPercent = exclusive.discount_percent || 0;
          finalPrice = finalPrice * (100 - totalDiscountPercent) / 100;
          promotion = {
            id: item.product_id,
            promotion_id: exclusive.promotion_id,
            name: lang === 'en' ? exclusive.promotion_name_en || exclusive.promotion_name :
                  lang === 'ar' ? exclusive.promotion_name_ar || exclusive.promotion_name :
                  exclusive.promotion_name,
            discount_percent: totalDiscountPercent,
            end_time: exclusive.end_time,
            is_expired: false,
            promotion_price: finalPrice,
            original_price: parseFloat(item.original_price) || 0,
            color: exclusive.promotion_color,
            is_exclusive: true
          };
        } else {
          // 无独占：所有可叠加促销相乘
          const sortedPromos = [...promos].sort((a: any, b: any) => a.priority - b.priority);
          let multiplier = 1;
          sortedPromos.forEach((p: any) => {
            multiplier *= (1 - (p.discount_percent || 0) / 100);
          });
          totalDiscountPercent = Math.round((1 - multiplier) * 10000) / 100;
          finalPrice = finalPrice * multiplier;
          currentPrice = finalPrice;

          // 返回第一个促销作为主促销（用于显示）
          const mainPromo = sortedPromos[0];
          promotion = {
            id: item.product_id,
            promotion_id: mainPromo.promotion_id,
            name: lang === 'en' ? mainPromo.promotion_name_en || mainPromo.promotion_name :
                  lang === 'ar' ? mainPromo.promotion_name_ar || mainPromo.promotion_name :
                  mainPromo.promotion_name,
            discount_percent: totalDiscountPercent,
            end_time: mainPromo.end_time,
            is_expired: false,
            promotion_price: finalPrice,
            original_price: parseFloat(item.original_price) || 0,
            color: mainPromo.promotion_color,
            is_exclusive: false
          };
        }

        // 构建所有促销的数组（用于显示）
        promotions = promos.map((p: any) => ({
          id: p.promotion_id,
          name: lang === 'en' ? p.promotion_name_en || p.promotion_name :
                lang === 'ar' ? p.promotion_name_ar || p.promotion_name :
                p.promotion_name,
          discount_percent: p.discount_percent,
          color: p.promotion_color,
          can_stack: p.can_stack,
          priority: p.priority
        }));
      }

      const item_total = currentPrice * item.quantity;
      total += item_total;
      total_items += item.quantity;

      return {
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        created_at: item.created_at,
        name: item.name,
        name_en: item.name_en,
        name_ar: item.name_ar,
        price: currentPrice,
        original_price: parseFloat(item.original_price) || 0,
        image: item.image,
        stock: item.stock,
        stock_status_id: item.stock_status_id,
        subtotal: item_total,
        promotion: promotion,
        promotions: promotions,
        total_discount_percent: promos.length > 0 ?
          (promotion?.discount_percent || 0) : 0
      };
    });

    return createSuccessResponse({
      success: true,
      data: {
        items,
        total,
        total_items
      }
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const lang = getLangFromRequest(request);

    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const data = await request.json();
    const { product_id, quantity = 1 } = data;

    if (!product_id) {
      return createErrorResponse('PRODUCT_NOT_FOUND', lang, 400);
    }

    const user_id = authResult.user?.userId;

    // Check if product exists and get stock from inventory
    const productResult = await query(
      `SELECT p.id, p.name, COALESCE(i.quantity, 0) as stock
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.id = ?`,
      [product_id]
    );
    if (productResult.rows.length === 0) {
      return createErrorResponse('PRODUCT_NOT_FOUND', lang, 404);
    }

    const product = productResult.rows[0];

    // Check if item already in cart
    const existingItem = await query(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
      [user_id, product_id]
    );

    let additionalQuantity = quantity;
    let result;

    if (existingItem.rows.length > 0) {
      // Update quantity - check stock again from inventory
      additionalQuantity = quantity; // 新增的数量
      const newQuantity = existingItem.rows[0].quantity + quantity;

      // 检查新增数量是否足够
      if (additionalQuantity > product.stock) {
        return NextResponse.json(
          {
            success: false,
            error_code: 'INSUFFICIENT_STOCK',
            message: getMessageWithParams('INSUFFICIENT_STOCK', lang, { requested: additionalQuantity, available: product.stock }),
            message_en: getMessageWithParams('INSUFFICIENT_STOCK', 'en', { requested: additionalQuantity, available: product.stock }),
            message_ar: getMessageWithParams('INSUFFICIENT_STOCK', 'ar', { requested: additionalQuantity, available: product.stock }),
            available_stock: product.stock,
          },
          { status: 400 }
        );
      }

      // 锁定库存（扣减）
      const lockResult = await query(
        `UPDATE inventory SET quantity = quantity - ?, status_id = ? WHERE product_id = ? AND quantity >= ?`,
        [additionalQuantity, calculateStockStatus(product.stock - additionalQuantity), product_id, additionalQuantity]
      );

      if (!lockResult.changes || lockResult.changes === 0) {
        return createErrorResponse('OUT_OF_STOCK', lang, 400);
      }

      // 更新购物车数量
      result = await query(
        'UPDATE cart_items SET quantity = ? WHERE id = ? RETURNING id, product_id, quantity',
        [newQuantity, existingItem.rows[0].id]
      );
    } else {
      // 新增商品 - 检查库存
      if (product.stock < quantity) {
        return NextResponse.json(
          {
            success: false,
            error_code: 'INSUFFICIENT_STOCK',
            message: getMessageWithParams('INSUFFICIENT_STOCK', lang, { requested: quantity, available: product.stock }),
            message_en: getMessageWithParams('INSUFFICIENT_STOCK', 'en', { requested: quantity, available: product.stock }),
            message_ar: getMessageWithParams('INSUFFICIENT_STOCK', 'ar', { requested: quantity, available: product.stock }),
            available_stock: product.stock,
          },
          { status: 400 }
        );
      }

      // 锁定库存（扣减）
      const lockResult = await query(
        `UPDATE inventory SET quantity = quantity - ?, status_id = ? WHERE product_id = ? AND quantity >= ?`,
        [quantity, calculateStockStatus(product.stock - quantity), product_id, quantity]
      );

      if (!lockResult.changes || lockResult.changes === 0) {
        return createErrorResponse('OUT_OF_STOCK', lang, 400);
      }

      // 添加新商品到购物车
      result = await query(
        'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?) RETURNING id, product_id, quantity',
        [user_id, product_id, quantity]
      );
    }

    // 记录库存流水
    const productName = product.name || `Product #${product_id}`;
    await query(
      `INSERT INTO inventory_transactions (
        product_id, product_name, transaction_type, quantity_change,
        quantity_before, quantity_after, reason, reference_type, reference_id,
        operator_id, operator_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product_id,
        productName,
        'sale', // 锁定库存
        -additionalQuantity,
        product.stock,
        product.stock - additionalQuantity,
        `Added to cart`,
        'cart',
        result.rows[0].id,
        user_id,
        authResult.user?.name || 'User'
      ]
    );

    return createSuccessResponse({
      success: true,
      data: result.rows[0]
    }, 201);
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add to cart' },
      { status: 500 }
    );
  }
}

// PUT /api/cart - Update cart item quantity
export async function PUT(request: NextRequest) {
  try {
    const lang = getLangFromRequest(request);

    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const data = await request.json();
    const { id, quantity } = data;

    if (!id || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Item ID and valid quantity are required' },
        { status: 400 }
      );
    }

    const user_id = authResult.user?.userId;

    // Check if item exists and belongs to user
    const itemResult = await query(
      'SELECT product_id, quantity as old_quantity FROM cart_items WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (itemResult.rows.length === 0) {
      return createErrorResponse('CART_ITEM_NOT_FOUND', lang, 404);
    }

    const currentItem = itemResult.rows[0];
    const product_id = currentItem.product_id;
    const oldQuantity = currentItem.old_quantity;
    const quantityDiff = quantity - oldQuantity;

    // 如果数量不变，直接返回
    if (quantityDiff === 0) {
      return createSuccessResponse({
        success: true,
        data: { id, product_id, quantity }
      });
    }

    // 获取当前库存信息
    const productResult = await query(
      `SELECT p.id, p.name, COALESCE(i.quantity, 0) as stock
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.id = ?`,
      [product_id]
    );
    const product = productResult.rows[0];
    const availableStock = product.stock || 0;

    if (quantityDiff > 0) {
      // 增加数量 - 需要额外锁定库存
      if (quantityDiff > availableStock) {
        return NextResponse.json(
          {
            success: false,
            error_code: 'INSUFFICIENT_STOCK',
            message: getMessageWithParams('INSUFFICIENT_STOCK', lang, { requested: quantityDiff, available: availableStock }),
            message_en: getMessageWithParams('INSUFFICIENT_STOCK', 'en', { requested: quantityDiff, available: availableStock }),
            message_ar: getMessageWithParams('INSUFFICIENT_STOCK', 'ar', { requested: quantityDiff, available: availableStock }),
            available_stock: availableStock,
          },
          { status: 400 }
        );
      }

      // 锁定额外库存（乐观锁）
      const lockResult = await query(
        `UPDATE inventory SET quantity = quantity - ?, status_id = ? WHERE product_id = ? AND quantity >= ?`,
        [quantityDiff, calculateStockStatus(availableStock - quantityDiff), product_id, quantityDiff]
      );

      if (!lockResult.changes || lockResult.changes === 0) {
        return createErrorResponse('OUT_OF_STOCK', lang, 400);
      }

      // 记录库存流水
      const productName = product.name || `Product #${product_id}`;
      await query(
        `INSERT INTO inventory_transactions (
          product_id, product_name, transaction_type, quantity_change,
          quantity_before, quantity_after, reason, reference_type, reference_id,
          operator_id, operator_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product_id,
          productName,
          'sale',
          -quantityDiff,
          availableStock,
          availableStock - quantityDiff,
          `Increased cart quantity from ${oldQuantity} to ${quantity}`,
          'cart',
          id,
          user_id,
          authResult.user?.name || 'User'
        ]
      );
    } else {
      // 减少数量 - 归还库存
      const returnQty = Math.abs(quantityDiff);

      await query(
        'UPDATE inventory SET quantity = quantity + ?, status_id = ? WHERE product_id = ?',
        [returnQty, calculateStockStatus(availableStock + returnQty), product_id]
      );

      // 记录库存流水
      const productName = product.name || `Product #${product_id}`;
      await query(
        `INSERT INTO inventory_transactions (
          product_id, product_name, transaction_type, quantity_change,
          quantity_before, quantity_after, reason, reference_type, reference_id,
          operator_id, operator_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product_id,
          productName,
          'cancel',
          returnQty,
          availableStock,
          availableStock + returnQty,
          `Decreased cart quantity from ${oldQuantity} to ${quantity}`,
          'cart',
          id,
          user_id,
          authResult.user?.name || 'User'
        ]
      );
    }

    // 更新购物车数量
    const result = await query(
      'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ? RETURNING id, product_id, quantity',
      [quantity, id, user_id]
    );

    return createSuccessResponse({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update cart' },
      { status: 500 }
    );
  }
}

// DELETE /api/cart - Remove item from cart
export async function DELETE(request: NextRequest) {
  try {
    const lang = getLangFromRequest(request);

    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clear = searchParams.get('clear');

    const user_id = authResult.user?.userId;

    if (clear === 'true') {
      // 清空购物车 - 先获取所有商品并归还库存
      const cartItems = await query(
        'SELECT product_id, quantity FROM cart_items WHERE user_id = ?',
        [user_id]
      );

      for (const item of cartItems.rows) {
        // 获取当前库存
        const stockBefore = await query(
          'SELECT quantity FROM inventory WHERE product_id = ?',
          [item.product_id]
        );
        const beforeQty = stockBefore.rows[0]?.quantity || 0;

        // 归还库存
        await query(
          'UPDATE inventory SET quantity = quantity + ?, status_id = ? WHERE product_id = ?',
          [item.quantity, calculateStockStatus(beforeQty + item.quantity), item.product_id]
        );

        // 获取商品名称
        const productInfo = await query('SELECT name FROM products WHERE id = ?', [item.product_id]);
        const productName = productInfo.rows[0]?.name || `Product #${item.product_id}`;

        // 记录库存流水
        await query(
          `INSERT INTO inventory_transactions (
            product_id, product_name, transaction_type, quantity_change,
            quantity_before, quantity_after, reason, reference_type, reference_id,
            operator_id, operator_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.product_id,
            productName,
            'cancel',
            item.quantity,
            beforeQty,
            beforeQty + item.quantity,
            `Removed from cart (clear all)`,
            'cart',
            item.product_id,
            user_id,
            authResult.user?.name || 'User'
          ]
        );
      }

      await query('DELETE FROM cart_items WHERE user_id = ?', [user_id]);
      return createSuccessResponse({
        success: true,
        data: { message: getMessage('CART_EMPTY', lang) }
      });
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // 获取被删除商品的信息（包含数量）
    const itemToDelete = await query(
      'SELECT product_id, quantity FROM cart_items WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (itemToDelete.rows.length === 0) {
      return createErrorResponse('CART_ITEM_NOT_FOUND', lang, 404);
    }

    const deletedItem = itemToDelete.rows[0];

    // 获取当前库存（归还前）
    const stockBefore = await query(
      'SELECT quantity FROM inventory WHERE product_id = ?',
      [deletedItem.product_id]
    );
    const beforeQty = stockBefore.rows[0]?.quantity || 0;

    // 归还库存
    await query(
      'UPDATE inventory SET quantity = quantity + ?, status_id = ? WHERE product_id = ?',
      [deletedItem.quantity, calculateStockStatus(beforeQty + deletedItem.quantity), deletedItem.product_id]
    );

    // 获取商品名称并记录库存流水
    const productInfo = await query('SELECT name FROM products WHERE id = ?', [deletedItem.product_id]);
    const productName = productInfo.rows[0]?.name || `Product #${deletedItem.product_id}`;

    await query(
      `INSERT INTO inventory_transactions (
        product_id, product_name, transaction_type, quantity_change,
        quantity_before, quantity_after, reason, reference_type, reference_id,
        operator_id, operator_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deletedItem.product_id,
        productName,
        'cancel',
        deletedItem.quantity,
        beforeQty,
        beforeQty + deletedItem.quantity,
        `Removed from cart`,
        'cart',
        deletedItem.product_id,
        user_id,
        authResult.user?.name || 'User'
      ]
    );

    // 删除购物车记录
    const result = await query(
      'DELETE FROM cart_items WHERE id = ? AND user_id = ? RETURNING id',
      [id, user_id]
    );

    return createSuccessResponse({
      success: true,
      data: { message: 'Item removed from cart' }
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove from cart' },
      { status: 500 }
    );
  }
}
