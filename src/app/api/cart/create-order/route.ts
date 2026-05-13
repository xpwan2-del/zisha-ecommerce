import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { applyPromotions } from '@/lib/pricing/cartPricing';
import { calculateOrderPricing, persistOrderPricing } from '@/lib/order-pricing-service';
import { getMessageWithParams } from '@/lib/messages';
import { logMonitor } from '@/lib/utils/logger';

/**
 * @api {POST} /api/cart/create-order 购物车下单
 * @apiName CreateOrderFromCart
 * @apiGroup CART
 * @apiDescription 将购物车中已预占库存的商品创建为订单，并清空对应购物车项。
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
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
    const productDiscountUsd = Math.max(0, round2(totalOriginalUsd - subtotalUsd));
    const orderNumber = `ORD-${randomUUID()}`;

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
          0,
          productDiscountUsd,
          subtotalUsd,
          addressId,
          0,
          JSON.stringify(couponIds)
        ]
      );

      const orderId = Number(orderInsert.lastInsertRowid);

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
      }

      const pricing = await calculateOrderPricing({
        orderId,
        userId,
        addressId,
        couponIds,
      });

      await persistOrderPricing({
        orderId,
        userId,
        addressId,
        couponIds,
        paymentMethod,
      });

      // ============================================================
      // 核心修改：在事务中清空购物车
      // ============================================================
      const deletePlaceholders = cartItemIds.map(() => '?').join(',');
      await query(
        `DELETE FROM cart_items WHERE user_id = ? AND id IN (${deletePlaceholders})`,
        [userId, ...cartItemIds]
      );

      logMonitor('CART', 'SUCCESS', {
        action: 'CLEAR_CART_ON_ORDER',
        userId,
        orderId,
        clearedItemIds: cartItemIds
      });

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          order_id: orderId,
          order_number: orderNumber,
          payment_method: paymentMethod,
          amount_usd: pricing.total_usd,
          coupon_discount: pricing.coupon_discount,
          coupon_details: pricing.coupon_details,
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
