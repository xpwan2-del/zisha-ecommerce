import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 快速订单 - 获取下单数据
 * ============================================================
 *
 * @api {GET} /api/quick-order 获取快速下单所需数据
 * @apiName GetQuickOrderData
 * @apiGroup QuickOrder
 * @apiDescription 获取快速下单所需的商品信息、用户地址、可用水优惠券
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 * @apiHeader {String} [Authorization] Bearer Token，用户认证凭证
 *
 * @apiParam {Number} product_id 商品ID，必需
 * @apiParam {Number} [quantity=1] 购买数量
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "product": {...},
 *         "quantity": 1,
 *         "subtotal": 100,
 *         "addresses": [...],
 *         "coupons": []
 *       }
 *     }
 *
 * @apiError {String} UNAUTHORIZED 未登录
 * @apiError {String} PRODUCT_NOT_FOUND 商品不存在
 */

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

// 计算商品最终促销价（从现有支付逻辑复用）
async function calculateProductPrice(productId: number): Promise<{ originalPrice: number; finalPrice: number; discount: number; promotions: Array<{id: number; name: string; discount: number; percent: number}> }> {
  try {
    const productResult = await query(
      `SELECT price FROM product_prices WHERE product_id = ? AND currency = 'USD'`,
      [productId]
    );

    if (productResult.rows.length === 0) {
      throw new Error(`Product ${productId} not found`);
    }

    const priceValue = productResult.rows[0]?.price;
    const originalPrice = typeof priceValue === 'number' ? priceValue : parseFloat(String(priceValue)) || 0;

    const promoResult = await query(`
      SELECT
        pr.id as promo_id,
        pr.name as promo_name,
        pr.discount_percent,
        pp.can_stack
      FROM product_promotions pp
      JOIN promotions pr ON pp.promotion_id = pr.id
      WHERE pp.product_id = ?
        AND datetime(pp.start_time) <= datetime('now')
        AND datetime(pp.end_time) >= datetime('now')
    `, [productId]);

    const promos = promoResult.rows || [];
    const promotions: Array<{id: number; name: string; discount: number; percent: number}> = [];
    let finalPrice = originalPrice;

    if (promos.length > 0) {
      const exclusive = promos.find((p: any) => p && p.can_stack === 1);

      if (exclusive && exclusive.discount_percent) {
        finalPrice = originalPrice * (1 - exclusive.discount_percent / 100);
        promotions.push({
          id: exclusive.promo_id,
          name: exclusive.promo_name || '促销活动',
          discount: originalPrice - finalPrice,
          percent: exclusive.discount_percent
        });
      } else {
        let multiplier = 1;
        promos.forEach((p: any) => {
          if (p && p.discount_percent) {
            multiplier *= (1 - p.discount_percent / 100);
            promotions.push({
              id: p.promo_id,
              name: p.promo_name || '促销活动',
              discount: originalPrice * p.discount_percent / 100,
              percent: p.discount_percent
            });
          }
        });
        finalPrice = originalPrice * multiplier;
      }
    }

    const discount = originalPrice - finalPrice;

    return { originalPrice, finalPrice, discount, promotions };
  } catch (error) {
    console.error('calculateProductPrice error:', error);
    throw error;
  }
}

// 获取用户可用优惠券（根据订单金额判断）
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

// 获取用户已使用优惠券
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
    expires_at: row.expires_at,
    used_order_id: row.used_order_id
  }));
}

// 获取用户已过期优惠券
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

// 获取用户可领取优惠券（未领取但可以领取）
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
  logMonitor('QUICK_ORDER', 'REQUEST', {
    method: 'GET',
    path: '/api/quick-order'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }
    const userId = authResult.user.userId;

    const { searchParams } = new URL(request.url);
    const orderIdParam = searchParams.get('order_id');
    const orderNumberParam = searchParams.get('order_number');
    const productIdParam = searchParams.get('product_id');
    const quantity = parseInt(searchParams.get('quantity') || '1', 10);

    let productId = 0;
    let resolvedOrderNumber = orderNumberParam || orderIdParam;

    if (orderNumberParam && orderNumberParam.startsWith('PRODUCT_')) {
      const parts = orderNumberParam.split('_');
      if (parts.length >= 2) {
        productId = parseInt(parts[1], 10) || 0;
      }
    } else if (productIdParam) {
      productId = parseInt(productIdParam, 10) || 0;
    }

    if (resolvedOrderNumber && !resolvedOrderNumber.startsWith('PRODUCT_')) {
      const orderResult = await query(`
        SELECT o.*, oi.product_id, oi.quantity, oi.price, oi.original_price, oi.promotion_ids,
               p.name, p.name_en, p.image, i.quantity as product_stock,
               pp_usd.price as price_usd
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN inventory i ON p.id = i.product_id
        LEFT JOIN product_prices pp_usd ON p.id = pp_usd.product_id AND pp_usd.currency = 'USD'
        WHERE o.order_number = ? AND o.user_id = ?
      `, [resolvedOrderNumber, userId]);

      if (orderResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        );
      }

      const order = orderResult.rows[0];
      const { originalPrice, finalPrice, discount, promotions } = await calculateProductPrice(order.product_id);

      const addressesResult = await query(`
        SELECT id, contact_name, phone, country_name, state_name, city, street_address, is_default
        FROM addresses
        WHERE user_id = ?
        ORDER BY is_default DESC, id DESC
      `, [userId]);

      const addresses = (addressesResult.rows || []).map((addr: any) => ({
        id: addr.id,
        name: addr.contact_name,
        phone: addr.phone,
        country: addr.country_name,
        state: addr.state_name,
        city: addr.city,
        address: addr.street_address,
        is_default: !!addr.is_default
      }));

      const subtotal = finalPrice * order.quantity;
      const originalSubtotal = originalPrice * order.quantity;
      const coupons = await getUserCoupons(String(userId), subtotal);
      const usedCoupons = await getUsedCoupons(String(userId));
      const expiredCoupons = await getExpiredCoupons(String(userId));
      const claimableCoupons = await getClaimableCoupons(String(userId));

      logMonitor('QUICK_ORDER', 'SUCCESS', {
        action: 'GET_QUICK_ORDER_DATA_BY_ORDER_NUMBER',
        userId,
        orderNumber: resolvedOrderNumber
      });

      return NextResponse.json({
        success: true,
        data: {
          order_id: order.id,
          order_number: order.order_number,
          order_status: order.order_status,
          product: {
            id: order.product_id,
            name: order.name,
            name_en: order.name_en,
            image: order.image,
            price: finalPrice,
            original_price: originalPrice,
            discount_amount: discount,
            currency: 'AED',
            price_usd: order.price_usd || 0,
            stock: order.product_stock ?? 0
          },
          quantity: order.quantity,
          subtotal,
          original_subtotal: originalSubtotal,
          currency: 'AED',
          addresses,
          coupons: {
            ...coupons,
            used: usedCoupons,
            expired: expiredCoupons,
            claimable: claimableCoupons
          },
          promotion_ids: order.promotion_ids ? JSON.parse(order.promotion_ids) : []
        }
      });
    }

    if (!productId) {
      logMonitor('QUICK_ORDER', 'ERROR', { reason: 'Product ID or Order ID is required' });
      return NextResponse.json(
        { success: false, error: 'Product ID or Order ID is required' },
        { status: 400 }
      );
    }

    if (quantity <= 0 || quantity > 99) {
      logMonitor('QUICK_ORDER', 'ERROR', { reason: 'Invalid quantity', quantity });
      return NextResponse.json(
        { success: false, error: 'Invalid quantity' },
        { status: 400 }
      );
    }

    const productResult = await query(`
      SELECT p.*, i.quantity as stock,
             pp_usd.price as price_usd
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      LEFT JOIN product_prices pp_usd ON p.id = pp_usd.product_id AND pp_usd.currency = 'USD'
      WHERE p.id = ?
    `, [productId]);
    if (productResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = productResult.rows[0];
    const { originalPrice, finalPrice, discount, promotions } = await calculateProductPrice(productId);

    const subtotal = finalPrice * quantity;
    const originalSubtotal = originalPrice * quantity;

    const addressesResult = await query(`
      SELECT id, contact_name, phone, country_name, state_name, city, street_address, is_default
      FROM addresses
      WHERE user_id = ?
      ORDER BY is_default DESC, id DESC
    `, [userId]);

    const addresses = (addressesResult.rows || []).map((addr: any) => ({
      id: addr.id,
      name: addr.contact_name,
      phone: addr.phone,
      country: addr.country_name,
      state: addr.state_name,
      city: addr.city,
      address: addr.street_address,
      is_default: !!addr.is_default
    }));

    const coupons = await getUserCoupons(String(userId), subtotal);
    const usedCoupons = await getUsedCoupons(String(userId));
    const expiredCoupons = await getExpiredCoupons(String(userId));
    const claimableCoupons = await getClaimableCoupons(String(userId));

    logMonitor('QUICK_ORDER', 'SUCCESS', {
      action: 'GET_QUICK_ORDER_DATA',
      userId,
      productId,
      quantity,
      couponCount: coupons.available.length
    });

    return NextResponse.json({
      success: true,
      data: {
        order_id: product.id,
        order_number: `PRODUCT_${productId}_${quantity}`,
        product: {
          id: product.id,
          name: product.name,
          name_en: product.name_en,
          name_ar: product.name_ar,
          image: product.image,
          price_usd: parseFloat(product.price_usd) || 0,
          original_price_usd: parseFloat(product.price_usd) || 0,
          discount_amount: discount,
          stock: product.stock ?? 0
        },
        quantity,
        subtotal_usd: subtotal,
        original_subtotal_usd: originalSubtotal,
        subtotal: subtotal,
        original_subtotal: originalSubtotal,
        original_price: parseFloat(product.price_usd) || 0,
        product_discount: discount,
        product_promotions: promotions,
        coupon_discount: 0,
        shipping_fee: 0,
        shipping_fee_usd: 0,
        total_usd: subtotal,
        display_currency: 'USD',
        display_total_usd: subtotal,
        addresses,
        coupons: {
          ...coupons,
          used: usedCoupons,
          expired: expiredCoupons,
          claimable: claimableCoupons
        }
      }
    });
  } catch (error) {
    console.error('Error in quick-order API:', error);
    logMonitor('QUICK_ORDER', 'ERROR', {
      action: 'GET_QUICK_ORDER_DATA',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quick order data' },
      { status: 500 }
    );
  }
}
