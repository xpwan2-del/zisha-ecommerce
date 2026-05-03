import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { applyPromotions } from '@/lib/pricing/cartPricing';
import { getMessageWithParams } from '@/lib/messages';
import { logMonitor } from '@/lib/utils/logger';

/**
 * @api {POST} /api/cart/create-order 购物车下单
 * @apiName CreateOrderFromCart
 * @apiGroup CART
 * @apiDescription 将购物车中的商品创建为订单。验证库存、计算促销价格、扣减库存。
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

async function applyMultipleCoupons(
  couponIds: number[],
  subtotal: number,
  userId: number
): Promise<{ totalDiscount: number; couponDetails: Array<{ id: number; discount: number; code: string; type: string; value: number }> }> {
  if (!couponIds || couponIds.length === 0) {
    return { totalDiscount: 0, couponDetails: [] };
  }

  const couponDetails: Array<{ id: number; discount: number; code: string; type: string; value: number }> = [];
  const percentageCoupons: Array<{ id: number; code: string; value: number }> = [];
  const fixedCoupons: Array<{ id: number; code: string; value: number }> = [];

  for (const couponId of couponIds) {
    const couponResult = await query(`
      SELECT c.type, c.value, c.code, c.is_stackable
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.id = ? AND uc.user_id = ? AND uc.status = 'active'
        AND datetime('now') < uc.expires_at
        AND c.is_active = 1
    `, [couponId, userId]);

    if (couponResult.rows.length === 0) continue;
    const coupon = couponResult.rows[0];

    if (coupon.is_stackable === 0 && couponDetails.length > 0) {
      continue;
    }

    if (coupon.type === 'percentage') {
      percentageCoupons.push({
        id: couponId,
        code: coupon.code || '',
        value: parseFloat(coupon.value)
      });
    } else if (coupon.type === 'fixed') {
      fixedCoupons.push({
        id: couponId,
        code: coupon.code || '',
        value: parseFloat(coupon.value)
      });
    }
  }

  let remainingSubtotal = subtotal;
  let totalDiscount = 0;

  if (percentageCoupons.length > 0) {
    const multiplier = percentageCoupons.reduce((acc, c) => acc * (1 - c.value / 100), 1);
    const afterPercentage = subtotal * multiplier;
    const percentageDiscount = subtotal - afterPercentage;
    const totalPercentageValue = percentageCoupons.reduce((acc, c) => acc + c.value, 0);

    for (const c of percentageCoupons) {
      const discount = totalPercentageValue > 0
        ? percentageDiscount * (c.value / totalPercentageValue)
        : 0;

      totalDiscount += discount;
      remainingSubtotal = afterPercentage;
      couponDetails.push({
        id: c.id,
        discount: Math.round(discount * 100) / 100,
        code: c.code,
        type: 'percentage',
        value: c.value
      });
    }
  }

  if (fixedCoupons.length > 0) {
    for (const c of fixedCoupons) {
      const discount = Math.min(c.value, remainingSubtotal);
      totalDiscount += discount;
      remainingSubtotal -= discount;
      couponDetails.push({
        id: c.id,
        discount,
        code: c.code,
        type: 'fixed',
        value: c.value
      });
    }
  }

  return { totalDiscount, couponDetails };
}

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('ORDERS', 'REQUEST', {
    method: 'POST',
    path: '/api/cart/create-order',
    lang
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) return authResult.response;

    const userId = authResult.user.userId;
    const body = await request.json();
    const { cart_item_ids, address_id, coupon_ids, payment_method } = body || {};

    const cartItemIds: number[] = Array.isArray(cart_item_ids)
      ? cart_item_ids.map((n: any) => parseInt(n, 10)).filter((n: any) => Number.isFinite(n))
      : [];

    const addressId = parseInt(address_id, 10);
    const couponIds: number[] = Array.isArray(coupon_ids)
      ? coupon_ids.map((n: any) => parseInt(n, 10)).filter((n: any) => Number.isFinite(n))
      : [];

    const paymentMethod = String(payment_method || '').toLowerCase();

    if (cartItemIds.length === 0 || !addressId || !paymentMethod) {
      return NextResponse.json({ success: false, error: 'Missing params' }, { status: 400 });
    }

    const addressResult = await query(
      `SELECT id FROM addresses WHERE id = ? AND user_id = ?`,
      [addressId, userId]
    );
    if (addressResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Address not found' }, { status: 404 });
    }

    const placeholders = cartItemIds.map(() => '?').join(',');
    const cartItemsResult = await query(
      `
      SELECT
        ci.id,
        ci.product_id,
        ci.quantity,
        p.name,
                p.image,
        i.quantity as stock,
        MAX(CASE WHEN pp.currency = 'USD' THEN pp.price END) as price_usd
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN inventory i ON ci.product_id = i.product_id
      LEFT JOIN product_prices pp ON ci.product_id = pp.product_id
      WHERE ci.user_id = ? AND ci.id IN (${placeholders})
      GROUP BY ci.id
      `,
      [userId, ...cartItemIds]
    );

    if (!cartItemsResult.rows || cartItemsResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart items not found' }, { status: 404 });
    }

    if (cartItemsResult.rows.length !== cartItemIds.length) {
      return NextResponse.json({ success: false, error: 'Some cart items not found' }, { status: 404 });
    }

    const productIds = cartItemsResult.rows.map((r: any) => r.product_id);
    const promoPlaceholders = productIds.map(() => '?').join(',');
    const promoResult = await query(
      `
      SELECT
        pp.id,
        pp.product_id,
        pp.promotion_id,
        pp.original_price,
        pp.end_time,
        pp.can_stack,
        pp.priority,
        pr.discount_percent
      FROM product_promotions pp
      JOIN promotions pr ON pp.promotion_id = pr.id
      WHERE pp.product_id IN (${promoPlaceholders})
        AND datetime(pp.start_time) <= datetime('now')
        AND datetime(pp.end_time) >= datetime('now')
      ORDER BY pp.product_id, pp.priority ASC
      `,
      productIds
    );

    const promotionsMap = new Map<number, any[]>();
    for (const p of promoResult.rows || []) {
      if (!promotionsMap.has(p.product_id)) promotionsMap.set(p.product_id, []);
      promotionsMap.get(p.product_id)!.push(p);
    }

    const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

    const items = cartItemsResult.rows.map((row: any) => {
      const promos = promotionsMap.get(row.product_id) || [];
      const originalUsd = parseFloat(row.price_usd) || 0;
      const finalUsd = round2(applyPromotions(originalUsd, promos).finalPrice);
      const promotionIds = promos.map((p: any) => p.id);

      return {
        cart_item_id: row.id,
        product_id: row.product_id,
        name: row.name,
        image: row.image,
        quantity: row.quantity,
        stock: row.stock || 0,
        original_price_usd: originalUsd,
        price_usd: finalUsd,
        promotion_ids: promotionIds
      };
    });

    const failedItems: Array<{ product_id: number; requested: number; available: number }> = [];
    for (const item of items) {
      if ((item.stock || 0) < item.quantity) {
        failedItems.push({ product_id: item.product_id, requested: item.quantity, available: item.stock || 0 });
      }
    }
    if (failedItems.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error_code: 'INSUFFICIENT_STOCK',
          message: getMessageWithParams('INSUFFICIENT_STOCK', lang, { requested: failedItems[0].requested, available: failedItems[0].available }),
          message_en: getMessageWithParams('INSUFFICIENT_STOCK', 'en', { requested: failedItems[0].requested, available: failedItems[0].available }),
          message_ar: getMessageWithParams('INSUFFICIENT_STOCK', 'ar', { requested: failedItems[0].requested, available: failedItems[0].available }),
          failed_items: failedItems
        },
        { status: 400 }
      );
    }

    const totalOriginalUsd = round2(items.reduce((sum, i) => sum + i.original_price_usd * i.quantity, 0));
    const subtotalUsd = round2(items.reduce((sum, i) => sum + i.price_usd * i.quantity, 0));

    const { totalDiscount, couponDetails } = await applyMultipleCoupons(couponIds, subtotalUsd, userId);
    const couponDiscount = Math.min(round2(totalDiscount), subtotalUsd);

    const shippingFee = 0;
    const finalUsd = Math.max(0, round2(subtotalUsd - couponDiscount + shippingFee));

    const productDiscountUsd = Math.max(0, round2(totalOriginalUsd - subtotalUsd));
    const orderFinalDiscountAmount = round2(productDiscountUsd + couponDiscount);

    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    await query('BEGIN TRANSACTION');
    try {
      const orderInsert = await query(
        `INSERT INTO orders (
          user_id, order_number, payment_method, order_status,
          total_after_promotions_amount, total_original_price, total_coupon_discount,
          order_final_discount_amount, final_amount,
          shipping_address_id, shipping_fee, coupon_ids, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          userId,
          orderNumber,
          paymentMethod,
          'pending',
          subtotalUsd,
          totalOriginalUsd,
          couponDiscount,
          orderFinalDiscountAmount,
          finalUsd,
          addressId,
          shippingFee,
          JSON.stringify(couponIds)
        ]
      );

      const orderId = orderInsert.lastInsertRowid;

      for (const item of items) {
        const discountAmount = round2((item.original_price_usd - item.price_usd) * item.quantity);

        await query(
          `INSERT INTO order_items (order_id, product_id, quantity, specifications, original_price, promotion_ids, total_promotions_discount_amount)
           VALUES (?, ?, ?, '{}', ?, ?, ?)`,
          [
            orderId,
            item.product_id,
            item.quantity,
            item.original_price_usd,
            item.promotion_ids.length > 0 ? JSON.stringify(item.promotion_ids) : null,
            discountAmount
          ]
        );

        const beforeStockResult = await query(
          'SELECT quantity FROM inventory WHERE product_id = ?',
          [item.product_id]
        );
        const beforeStock = beforeStockResult.rows[0]?.quantity || 0;

        if (beforeStock < item.quantity) {
          await query('ROLLBACK');
          return NextResponse.json(
            {
              success: false,
              error_code: 'INSUFFICIENT_STOCK',
              message: getMessageWithParams('INSUFFICIENT_STOCK', lang, { requested: item.quantity, available: beforeStock }),
              message_en: getMessageWithParams('INSUFFICIENT_STOCK', 'en', { requested: item.quantity, available: beforeStock }),
              message_ar: getMessageWithParams('INSUFFICIENT_STOCK', 'ar', { requested: item.quantity, available: beforeStock }),
              failed_items: [{ product_id: item.product_id, requested: item.quantity, available: beforeStock }]
            },
            { status: 400 }
          );
        }

        const updateResult = await query(
          'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND quantity >= ?',
          [item.quantity, item.product_id, item.quantity]
        );

        if (!updateResult.changes || updateResult.changes === 0) {
          await query('ROLLBACK');
          return NextResponse.json(
            {
              success: false,
              error_code: 'INSUFFICIENT_STOCK',
              message: getMessageWithParams('INSUFFICIENT_STOCK', lang, { requested: item.quantity, available: beforeStock }),
              message_en: getMessageWithParams('INSUFFICIENT_STOCK', 'en', { requested: item.quantity, available: beforeStock }),
              message_ar: getMessageWithParams('INSUFFICIENT_STOCK', 'ar', { requested: item.quantity, available: beforeStock }),
              failed_items: [{ product_id: item.product_id, requested: item.quantity, available: beforeStock }]
            },
            { status: 400 }
          );
        }

        const productInfo = await query('SELECT name FROM products WHERE id = ?', [item.product_id]);
        const productName = productInfo.rows[0]?.name || 'Product';

        const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['sales_creat']);
        const transactionTypeId = typeResult.rows[0]?.id || 1;

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
            -item.quantity,
            beforeStock,
            beforeStock - item.quantity,
            `Order ${orderNumber}`,
            'order',
            orderId,
            userId,
            authResult.user?.name || 'User'
          ]
        );
      }

      if (couponIds.length > 0) {
        for (const couponId of couponIds) {
          await query(
            `UPDATE user_coupons SET status = 'used' WHERE id = ? AND user_id = ?`,
            [couponId, userId]
          );
          await query(
            `INSERT INTO order_coupons (order_id, coupon_id, user_id, discount_applied, status, applied_at)
             VALUES (?, ?, ?, ?, 'applied', datetime('now'))`,
            [orderId, couponId, userId, couponDiscount / couponIds.length]
          );
        }
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          order_id: orderId,
          order_number: orderNumber,
          payment_method: paymentMethod,
          amount_usd: finalUsd,
          coupon_discount: couponDiscount,
          coupon_details: couponDetails,
          items: items.map((i) => ({
            product_id: i.product_id,
            name: i.name,
            image: i.image,
            price: i.price_usd,
            price_usd: i.price_usd,
            quantity: i.quantity
          }))
        }
      });
    } catch (e) {
      await query('ROLLBACK');
      throw e;
    }
  } catch (error) {
    console.error('Error creating cart order:', error);
    logMonitor('ORDERS', 'ERROR', { action: 'CREATE_CART_ORDER', error: String(error) });
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 });
  }
}
