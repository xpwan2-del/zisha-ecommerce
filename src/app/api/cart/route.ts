import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getMessage, getMessageWithParams } from '@/lib/messages';
import { logMonitor } from '@/lib/utils/logger';
import { applyPromotions } from '@/lib/pricing/cartPricing';

/**
 * ============================================================
 * 购物车管理
 * ============================================================
 *
 * @api {GET} /api/cart 获取购物车列表
 * @apiName GetCart
 * @apiGroup CART
 * @apiDescription 获取当前用户的购物车商品列表，包括商品信息、促销信息、价格计算
 *
 * @api {POST} /api/cart 添加商品到购物车
 * @apiName AddToCart
 * @apiGroup CART
 * @apiDescription 将商品添加到购物车，自动扣减库存
 *
 * @api {PUT} /api/cart 更新购物车商品数量
 * @apiName UpdateCartItem
 * @apiGroup CART
 * @apiDescription 更新购物车中商品的数量，自动调整库存
 *
 * @api {DELETE} /api/cart 清空购物车或删除商品
 * @apiName DeleteCartItem
 * @apiGroup CART
 * @apiDescription 清空购物车或删除指定的购物车商品
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 * @apiHeader {String} Authorization Bearer Token 用户认证凭证
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "items": [...],
 *         "total": 100.00,
 *         "total_items": 3
 *       }
 *     }
 *
 * @apiError {String} UNAUTHORIZED 未登录或Token无效
 * @apiError {String} PRODUCT_NOT_FOUND 商品不存在
 * @apiError {String} INSUFFICIENT_STOCK 库存不足
 * @apiError {String} OUT_OF_STOCK 库存耗尽
 * @apiError {String} CART_ITEM_NOT_FOUND 购物车商品不存在
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

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

interface CouponItem {
  id: number;
  coupon_id: number;
  code: string;
  name: string;
  type: string;
  value: number;
  is_stackable: number;
  permanent_days: number;
  description: string;
  expires_at: string;
}

async function getUserCoupons(userId: string, orderAmount: number) {
  const couponsResult = await query(`
    SELECT
      uc.id as user_coupon_id,
      c.id as coupon_id,
      c.code,
      c.name,
      c.type,
      c.value,
      c.is_stackable,
      c.permanent_days,
      c.start_date,
      c.end_date,
      c.description,
      uc.status as user_coupon_status,
      uc.expires_at
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.user_id = ?
      AND uc.status = 'active'
      AND (c.is_permanent = 1 OR datetime('now') < uc.expires_at)
      AND (c.is_permanent = 1 OR datetime('now') < c.end_date)
      AND c.is_active = 1
    ORDER BY uc.id DESC
  `, [userId]);

  const available: CouponItem[] = [];

  for (const row of couponsResult.rows) {
    const coupon: CouponItem = {
      id: row.user_coupon_id,
      coupon_id: row.coupon_id,
      code: row.code,
      name: row.name,
      type: row.type,
      value: row.value,
      is_stackable: row.is_stackable,
      permanent_days: row.permanent_days || 0,
      description: row.description,
      expires_at: row.expires_at
    };
    available.push(coupon);
  }

  return { available };
}

async function getUsedCoupons(userId: string) {
  const result = await query(`
    SELECT
      uc.id as user_coupon_id,
      c.id as coupon_id,
      c.code,
      c.name,
      c.type,
      c.value,
      c.is_stackable,
      c.permanent_days,
      c.start_date,
      c.end_date,
      c.description,
      uc.status as user_coupon_status,
      uc.expires_at,
      uc.used_order_id
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.user_id = ?
      AND uc.status = 'used'
    ORDER BY uc.received_at DESC
  `, [userId]);

  return result.rows.map((row: any) => ({
    id: row.user_coupon_id,
    coupon_id: row.coupon_id,
    code: row.code,
    name: row.name,
    type: row.type,
    value: row.value,
    is_stackable: row.is_stackable,
    permanent_days: row.permanent_days || 0,
    description: row.description,
    expires_at: row.expires_at
  }));
}

async function getExpiredCoupons(userId: string) {
  const result = await query(`
    SELECT
      uc.id as user_coupon_id,
      c.id as coupon_id,
      c.code,
      c.name,
      c.type,
      c.value,
      c.is_stackable,
      c.permanent_days,
      c.start_date,
      c.end_date,
      c.description,
      uc.status as user_coupon_status,
      uc.expires_at
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.user_id = ?
      AND uc.status = 'active'
      AND datetime('now') >= uc.expires_at
      AND (c.is_permanent = 0 OR c.is_permanent IS NULL)
    ORDER BY uc.expires_at DESC
  `, [userId]);

  return result.rows.map((row: any) => ({
    id: row.user_coupon_id,
    coupon_id: row.coupon_id,
    code: row.code,
    name: row.name,
    type: row.type,
    value: row.value,
    is_stackable: row.is_stackable,
    permanent_days: row.permanent_days || 0,
    description: row.description,
    expires_at: row.expires_at
  }));
}

async function getClaimableCoupons(userId: string) {
  const result = await query(`
    SELECT
      c.id as coupon_id,
      c.code,
      c.name,
      c.type,
      c.value,
      c.is_stackable,
      c.permanent_days,
      c.start_date,
      c.end_date,
      c.description,
      c.is_active
    FROM coupons c
    WHERE c.is_active = 1
      AND c.start_date <= datetime('now')
      AND c.end_date >= datetime('now')
      AND c.id NOT IN (SELECT coupon_id FROM user_coupons WHERE user_id = ?)
    ORDER BY c.created_at DESC
  `, [userId]);

  return result.rows.map((row: any) => ({
    id: 0,
    coupon_id: row.coupon_id,
    code: row.code,
    name: row.name,
    type: row.type,
    value: row.value,
    is_stackable: row.is_stackable,
    permanent_days: row.permanent_days || 0,
    description: row.description,
    expires_at: row.end_date
  }));
}

export async function GET(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('CART', 'REQUEST', {
    method: 'GET',
    path: '/api/cart'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('CART', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const user_id = authResult.user?.userId;
    logMonitor('CART', 'INFO', { userId: user_id, action: 'GET_CART' });

    const result = await query(
      `SELECT
        c.id,
        c.product_id,
        c.quantity,
        c.created_at,
        p.name,
        p.name_en,
        p.name_ar,
        p.image,
        COALESCE(i.quantity, 0) as stock,
        i.status_id as stock_status_id,
        pp_usd.price as price_usd
      FROM cart_items c
      LEFT JOIN products p ON c.product_id = p.id
      LEFT JOIN inventory i ON c.product_id = i.product_id
      LEFT JOIN product_prices pp_usd ON p.id = pp_usd.product_id AND pp_usd.currency = 'USD'
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC`,
      [user_id]
    );

    const productIds = result.rows.map((row: any) => row.product_id);

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

      for (const promo of promoQuery.rows) {
        if (!promotionsMap[promo.product_id]) {
          promotionsMap[promo.product_id] = [];
        }
        promotionsMap[promo.product_id].push(promo);
      }
    }

    const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

    let total_usd = 0;
    let total_items = 0;
    const items = result.rows.map((item: any) => {
      const originalPriceUsd = parseFloat(item.price_usd) || 0;

      let finalPriceUsd = originalPriceUsd;
      let promotion = null;
      let promotions: any[] = [];

      const promos = promotionsMap[item.product_id] || [];
      if (promos.length > 0) {
        const sortedPromos = [...promos].sort((a: any, b: any) => a.priority - b.priority);
        const exclusive = sortedPromos.find((p: any) => p.can_stack === 1);
        const percentInfo = applyPromotions(100, promos);
        const totalDiscountPercent = percentInfo.totalDiscountPercent || 0;

        finalPriceUsd = applyPromotions(originalPriceUsd, promos).finalPrice;

        const mainPromo = exclusive || sortedPromos[0];
        promotion = {
          id: item.product_id,
          promotion_id: mainPromo.promotion_id,
          name: lang === 'en' ? mainPromo.promotion_name_en || mainPromo.promotion_name :
                lang === 'ar' ? mainPromo.promotion_name_ar || mainPromo.promotion_name :
                mainPromo.promotion_name,
          discount_percent: totalDiscountPercent,
          end_time: mainPromo.end_time,
          is_expired: false,
          promotion_price: round2(finalPriceUsd),
          promotion_price_usd: round2(finalPriceUsd),
          original_price: originalPriceUsd,
          original_price_usd: originalPriceUsd,
          color: mainPromo.promotion_color,
          is_exclusive: Boolean(exclusive)
        };

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

      finalPriceUsd = round2(finalPriceUsd);

      const subtotal_usd = round2(finalPriceUsd * item.quantity);

      total_usd = round2(total_usd + subtotal_usd);
      total_items += item.quantity;

      return {
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        created_at: item.created_at,
        name: item.name,
        name_en: item.name_en,
        name_ar: item.name_ar,
        price: finalPriceUsd,
        original_price: originalPriceUsd,
        price_usd: originalPriceUsd,
        final_price_usd: finalPriceUsd,
        image: item.image,
        stock: item.stock,
        stock_status_id: item.stock_status_id,
        subtotal: subtotal_usd,
        subtotal_usd,
        promotion: promotion,
        promotions: promotions,
        total_discount_percent: promos.length > 0 ?
          (promotion?.discount_percent || 0) : 0
      };
    });

    logMonitor('CART', 'SUCCESS', {
      action: 'GET_CART',
      userId: user_id,
      itemsCount: items.length,
      total_usd,
      total_items
    });

    const coupons = await getUserCoupons(String(user_id), total_usd);
    const usedCoupons = await getUsedCoupons(String(user_id));
    const expiredCoupons = await getExpiredCoupons(String(user_id));
    const claimableCoupons = await getClaimableCoupons(String(user_id));

    return createSuccessResponse({
      success: true,
      data: {
        items,
        total: total_usd,
        total_usd,
        total_items,
        coupons: {
          ...coupons,
          unavailable: [],
          used: usedCoupons,
          expired: expiredCoupons,
          claimable: claimableCoupons
        }
      }
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    logMonitor('CART', 'ERROR', {
      action: 'GET_CART',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('CART', 'REQUEST', {
    method: 'POST',
    path: '/api/cart'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('CART', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const data = await request.json();
    const { product_id, quantity = 1 } = data;

    if (!product_id) {
      logMonitor('CART', 'VALIDATION_FAILED', {
        reason: 'Missing required field: product_id'
      });
      return createErrorResponse('PRODUCT_NOT_FOUND', lang, 400);
    }

    const user_id = authResult.user?.userId;
    logMonitor('CART', 'INFO', {
      userId: user_id,
      action: 'ADD_TO_CART',
      product_id,
      quantity
    });

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

    const existingItem = await query(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
      [user_id, product_id]
    );

    let additionalQuantity = quantity;
    let result;

    if (existingItem.rows.length > 0) {
      additionalQuantity = quantity;
      const newQuantity = existingItem.rows[0].quantity + quantity;

      if (quantity > product.stock) {
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

      const lockResult = await query(
        `UPDATE inventory SET quantity = quantity - ?, status_id = ? WHERE product_id = ? AND quantity >= ?`,
        [additionalQuantity, calculateStockStatus(product.stock - additionalQuantity), product_id, additionalQuantity]
      );

      if (!lockResult.changes || lockResult.changes === 0) {
        return createErrorResponse('OUT_OF_STOCK', lang, 400);
      }

      await query(
        'UPDATE cart_items SET quantity = ? WHERE id = ?',
        [newQuantity, existingItem.rows[0].id]
      );
      result = { rows: [{ id: existingItem.rows[0].id, product_id, quantity: newQuantity }] };
    } else {
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

      const lockResult = await query(
        `UPDATE inventory SET quantity = quantity - ?, status_id = (
          SELECT id FROM inventory_status
          WHERE threshold_min <= (SELECT quantity - ? FROM inventory WHERE product_id = ?)
          ORDER BY threshold_min DESC LIMIT 1
        ) WHERE product_id = ? AND quantity >= ?`,
        [quantity, quantity, product_id, product_id, quantity]
      );

      if (!lockResult.changes || lockResult.changes === 0) {
        return createErrorResponse('OUT_OF_STOCK', lang, 400);
      }

      try {
        const insertResult = await query(
          'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
          [user_id, product_id, quantity]
        );
        result = { rows: [{ id: insertResult.lastInsertRowid, product_id, quantity }] };
      } catch (error) {
        await query(
          `UPDATE inventory SET quantity = quantity + ?, status_id = (
            SELECT id FROM inventory_status
            WHERE threshold_min <= (SELECT quantity + ? FROM inventory WHERE product_id = ?)
            ORDER BY threshold_min DESC LIMIT 1
          ) WHERE product_id = ?`,
          [quantity, quantity, product_id, product_id]
        );
        throw error;
      }
    }

    const productName = product.name || `Product #${product_id}`;
    const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['cat_creat']);
    const transactionTypeId = typeResult.rows[0]?.id || 7;

    await query(
      `INSERT INTO inventory_transactions (
        product_id, product_name, transaction_type_id, quantity_change,
        quantity_before, quantity_after, reason, reference_type, reference_id,
        operator_id, operator_name, created_at
      ) VALUES (?, ?, ?, ?, ?,
        (SELECT quantity FROM inventory WHERE product_id = ?),
        ?, ?, ?, ?, ?, datetime('now'))`,
      [
        product_id,
        productName,
        transactionTypeId,
        -additionalQuantity,
        product.stock,
        product_id,
        `Added to cart`,
        'cart',
        result.rows[0].id,
        user_id,
        authResult.user?.name || 'User'
      ]
    );

    logMonitor('CART', 'SUCCESS', {
      action: 'ADD_TO_CART',
      userId: user_id,
      product_id,
      quantity: additionalQuantity,
      cart_item_id: result.rows[0].id
    });

    return createSuccessResponse({
      success: true,
      data: result.rows[0]
    }, 201);
  } catch (error) {
    console.error('Error adding to cart:', error);
    logMonitor('CART', 'ERROR', {
      action: 'ADD_TO_CART',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to add to cart' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('CART', 'REQUEST', {
    method: 'PUT',
    path: '/api/cart'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('CART', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const data = await request.json();
    const { id, quantity } = data;

    if (!id || quantity <= 0) {
      logMonitor('CART', 'VALIDATION_FAILED', {
        reason: 'Missing required field: id or invalid quantity',
        id,
        quantity
      });
      return NextResponse.json(
        { success: false, error: 'Item ID and valid quantity are required' },
        { status: 400 }
      );
    }

    const user_id = authResult.user?.userId;
    logMonitor('CART', 'INFO', {
      userId: user_id,
      action: 'UPDATE_CART_ITEM',
      cart_item_id: id,
      new_quantity: quantity
    });

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

    if (quantityDiff === 0) {
      return createSuccessResponse({
        success: true,
        data: { id, product_id, quantity }
      });
    }

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

      const lockResult = await query(
        `UPDATE inventory SET quantity = quantity - ?, status_id = ? WHERE product_id = ? AND quantity >= ?`,
        [quantityDiff, calculateStockStatus(availableStock - quantityDiff), product_id, quantityDiff]
      );

      if (!lockResult.changes || lockResult.changes === 0) {
        return createErrorResponse('OUT_OF_STOCK', lang, 400);
      }

      const productName = product.name || `Product #${product_id}`;
      const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['cat_increase']);
      const transactionTypeId = typeResult.rows[0]?.id || 8;

      await query(
        `INSERT INTO inventory_transactions (
          product_id, product_name, transaction_type_id, quantity_change,
          quantity_before, quantity_after, reason, reference_type, reference_id,
          operator_id, operator_name, created_at
        ) VALUES (?, ?, ?, ?, ?,
          (SELECT quantity FROM inventory WHERE product_id = ?),
          ?, ?, ?, ?, ?, datetime('now'))`,
        [
          product_id,
          productName,
          transactionTypeId,
          -quantityDiff,
          availableStock,
          product_id,
          `Increased cart quantity from ${oldQuantity} to ${quantity}`,
          'cart',
          id,
          user_id,
          authResult.user?.name || 'User'
        ]
      );
    } else {
      const returnQty = Math.abs(quantityDiff);

      await query(
        'UPDATE inventory SET quantity = quantity + ?, status_id = ? WHERE product_id = ?',
        [returnQty, calculateStockStatus(availableStock + returnQty), product_id]
      );

      const productName = product.name || `Product #${product_id}`;
      const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['cat_reduce']);
      const transactionTypeId = typeResult.rows[0]?.id || 9;

      await query(
        `INSERT INTO inventory_transactions (
          product_id, product_name, transaction_type_id, quantity_change,
          quantity_before, quantity_after, reason, reference_type, reference_id,
          operator_id, operator_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          product_id,
          productName,
          transactionTypeId,
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

    await query(
      'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
      [quantity, id, user_id]
    );

    logMonitor('CART', 'SUCCESS', {
      action: 'UPDATE_CART_ITEM',
      userId: user_id,
      cart_item_id: id,
      product_id,
      old_quantity: oldQuantity,
      new_quantity: quantity
    });

    return createSuccessResponse({
      success: true,
      data: { id, product_id: undefined, quantity }
    });
  } catch (error) {
    console.error('Error updating cart:', error);
    logMonitor('CART', 'ERROR', {
      action: 'UPDATE_CART_ITEM',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to update cart' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('CART', 'REQUEST', {
    method: 'DELETE',
    path: '/api/cart'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('CART', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clear = searchParams.get('clear');

    const user_id = authResult.user?.userId;
    logMonitor('CART', 'INFO', {
      userId: user_id,
      action: clear === 'true' ? 'CLEAR_CART' : 'DELETE_CART_ITEM',
      cart_item_id: id
    });

    if (clear === 'true') {
      const cartItems = await query(
        'SELECT product_id, quantity FROM cart_items WHERE user_id = ?',
        [user_id]
      );

      for (const item of cartItems.rows) {
        const stockBefore = await query(
          'SELECT quantity FROM inventory WHERE product_id = ?',
          [item.product_id]
        );
        const beforeQty = stockBefore.rows[0]?.quantity || 0;

        await query(
          'UPDATE inventory SET quantity = quantity + ?, status_id = ? WHERE product_id = ?',
          [item.quantity, calculateStockStatus(beforeQty + item.quantity), item.product_id]
        );

        const productInfo = await query('SELECT name FROM products WHERE id = ?', [item.product_id]);
        const productName = productInfo.rows[0]?.name || `Product #${item.product_id}`;

        const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['cat_delete']);
        const transactionTypeId = typeResult.rows[0]?.id || 10;

        await query(
          `INSERT INTO inventory_transactions (
            product_id, product_name, transaction_type_id, quantity_change,
            quantity_before, quantity_after, reason, reference_type, reference_id,
            operator_id, operator_name, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            item.product_id,
            productName,
            transactionTypeId,
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

      logMonitor('CART', 'SUCCESS', {
        action: 'CLEAR_CART',
        userId: user_id,
        itemsCleared: cartItems.rows.length
      });

      return createSuccessResponse({
        success: true,
        data: { message: getMessage('CART_EMPTY', lang) }
      });
    }

    if (!id) {
      logMonitor('CART', 'VALIDATION_FAILED', {
        reason: 'Missing required param: id'
      });
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const itemToDelete = await query(
      'SELECT product_id, quantity FROM cart_items WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (itemToDelete.rows.length === 0) {
      logMonitor('CART', 'NOT_FOUND', {
        reason: 'Cart item not found',
        cart_item_id: id,
        userId: user_id
      });
      return createErrorResponse('CART_ITEM_NOT_FOUND', lang, 404);
    }

    const deletedItem = itemToDelete.rows[0];

    const stockBefore = await query(
      'SELECT quantity FROM inventory WHERE product_id = ?',
      [deletedItem.product_id]
    );
    const beforeQty = stockBefore.rows[0]?.quantity || 0;

    await query(
      'UPDATE inventory SET quantity = quantity + ?, status_id = ? WHERE product_id = ?',
      [deletedItem.quantity, calculateStockStatus(beforeQty + deletedItem.quantity), deletedItem.product_id]
    );

    const productInfo = await query('SELECT name FROM products WHERE id = ?', [deletedItem.product_id]);
    const productName = productInfo.rows[0]?.name || `Product #${deletedItem.product_id}`;

    const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['cat_delete']);
    const transactionTypeId = typeResult.rows[0]?.id || 10;

    await query(
      `INSERT INTO inventory_transactions (
        product_id, product_name, transaction_type_id, quantity_change,
        quantity_before, quantity_after, reason, reference_type, reference_id,
        operator_id, operator_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        deletedItem.product_id,
        productName,
        transactionTypeId,
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

    await query(
      'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    logMonitor('CART', 'SUCCESS', {
      action: 'DELETE_CART_ITEM',
      userId: user_id,
      cart_item_id: id,
      product_id: deletedItem.product_id,
      quantity: deletedItem.quantity
    });

    return createSuccessResponse({
      success: true,
      data: { message: 'Item removed from cart' }
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    logMonitor('CART', 'ERROR', {
      action: 'DELETE_CART_ITEM',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to remove from cart' },
      { status: 500 }
    );
  }
}
