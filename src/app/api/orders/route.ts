import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { query } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { createInventoryTransaction, InventoryTransactionCode } from '@/lib/inventory-transactions';
import { getMessage, getMessageWithParams } from '@/lib/messages';
import { logMonitor } from '@/lib/utils/logger';
import { applyPromotions } from '@/lib/pricing/cartPricing';
import { round2 } from '@/lib/pricing/orderAmountMath';
import { OrderStatusService, OrderEvent, OperatorType } from '@/lib/order-status-service';

/**
 * @api {GET} /api/orders 获取订单列表
 * @apiName GetOrders
 * @apiGroup ORDERS
 * @apiDescription 获取订单列表。普通用户获取自己的订单，管理员获取全部订单。支持分页和状态筛选。
 *
 * @api {POST} /api/orders 创建订单（管理员后台）
 * @apiName CreateOrder
 * @apiGroup ORDERS
 * @apiDescription 管理员在后台为用户创建订单。服务端验证价格和库存。
 *
 * @api {PUT} /api/orders 更新订单状态
 * @apiName UpdateOrderStatus
 * @apiGroup ORDERS
 * @apiDescription 管理员更新订单状态（确认/发货/完成/取消等）。
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

// GET /api/orders - Get orders (user's own or all if admin)
export async function GET(request: NextRequest) {
  const lang = getLangFromRequest(request);
  try {
    logMonitor('ORDERS', 'REQUEST', { method: 'GET' });

    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    let sql = `
      SELECT
        o.id,
        o.order_number,
        o.order_status,
        o.total_after_promotions_amount,
        o.order_final_discount_amount,
        o.final_amount,
        o.shipping_fee,
        o.shipping_address_id,
        o.created_at,
        o.updated_at,
        u.name as user_name,
        u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
    `;

    const params: any[] = [];

    // 普通用户只能看到自己的订单
    if (authResult.user?.role !== 'admin') {
      sql += ' WHERE o.user_id = ?';
      params.push(authResult.user?.userId);
    }

    if (status) {
      sql += params.length > 0 ? ' AND o.order_status = ?' : ' WHERE o.order_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const result = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM orders';
    const countParams: any[] = [];

    if (authResult.user?.role !== 'admin') {
      countSql += ' WHERE user_id = ?';
      countParams.push(authResult.user?.userId);
    }

    if (status) {
      countSql += countParams.length > 0 ? ' AND order_status = ?' : ' WHERE order_status = ?';
      countParams.push(status);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult.rows[0]?.total || 0;

    logMonitor('ORDERS', 'SUCCESS', { 
      action: 'GET_ORDERS', 
      orderCount: result.rows?.length || 0,
      total,
      page,
      limit 
    });

    return NextResponse.json({
      success: true,
      data: {
        orders: result.rows || [],
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    logMonitor('ORDERS', 'ERROR', { action: 'GET_ORDERS', error: error?.message || String(error) });
    console.error('Error fetching orders:', error);
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);
  try {
    logMonitor('ORDERS', 'REQUEST', { method: 'POST', action: 'CREATE_ORDER' });
    
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const data = await request.json();
    const { items, shipping_address_id, coupon_code } = data;

    if (!items || items.length === 0) {
      return createErrorResponse('MISSING_PARAMS', lang, 400);
    }

    // Calculate order total
    let total_amount = 0;

    const itemPromoInfo: Map<number, { originalPrice: number, promotionPrice: number, promotionIds: number[], discountAmount: number }> = new Map();

    // 检查商品活动是否过期，并计算促销价格
    for (const item of items) {
      const promoCheck = await query(
        `SELECT pp.id, pp.promotion_id, pr.name as promo_name, pr.discount_percent, pp.end_time, pp.can_stack, pp.priority, ppr.price as original_price
         FROM product_promotions pp
         JOIN promotions pr ON pp.promotion_id = pr.id
         JOIN product_prices ppr ON ppr.product_id = pp.product_id AND ppr.currency = 'USD'
         WHERE pp.product_id = ? AND pp.end_time > datetime('now') AND datetime(pp.start_time) <= datetime('now')`,
        [item.product_id]
      );

      if (promoCheck.rows && promoCheck.rows.length > 0) {
        const now = new Date();
        for (const promo of promoCheck.rows) {
          if (promo.end_time && new Date(promo.end_time) < now) {
            return createErrorResponse('PROMOTION_EXPIRED', lang, 400);
          }
        }

        const promos = promoCheck.rows;
        const originalPrice = round2(parseFloat(promos[0].original_price) || 0);
        const promotionResult = applyPromotions(originalPrice, promos);
        const promotionPrice = round2(promotionResult.finalPrice);
        const promotionIds = promos.map((p: any) => p.id);
        const discountAmount = round2(Math.max(0, originalPrice - promotionPrice));

        itemPromoInfo.set(item.product_id, {
          originalPrice,
          promotionPrice,
          promotionIds,
          discountAmount
        });

        total_amount = round2(total_amount + round2(promotionPrice * item.quantity));
      } else {
        const productResult = await query('SELECT pp.price FROM product_prices pp WHERE pp.product_id = ? AND pp.currency = ?', [item.product_id, 'USD']);
        if (productResult.rows.length === 0) {
          return createErrorResponse('PRODUCT_NOT_FOUND', lang, 404);
        }
        const productPrice = round2(parseFloat(productResult.rows[0].price) || 0);
        itemPromoInfo.set(item.product_id, {
          originalPrice: productPrice,
          promotionPrice: productPrice,
          promotionIds: [],
          discountAmount: 0
        });
        total_amount = round2(total_amount + round2(productPrice * item.quantity));
      }
    }

    let order_final_discount_amount = 0;
    if (coupon_code) {
      const couponResult = await query(
        'SELECT * FROM coupons WHERE code = ? AND is_active = true AND (expires_at IS NULL OR expires_at > datetime("now"))',
        [coupon_code]
      );
      if (couponResult.rows.length > 0) {
        const coupon = couponResult.rows[0];
        if (coupon.discount_type === 'percentage') {
          order_final_discount_amount = round2(total_amount * (coupon.discount_value / 100));
        } else {
          order_final_discount_amount = round2(coupon.discount_value);
        }
        order_final_discount_amount = round2(Math.min(order_final_discount_amount, total_amount));
      }
    }

    const shipping_fee = 0;
    const final_amount = round2(total_amount - order_final_discount_amount + shipping_fee);

    // Generate unique order number using UUID
    const order_number = `ORD-${randomUUID()}`;

    // Start transaction
    await query('BEGIN TRANSACTION');

    try {
      // Create order
      const orderInsertResult = await query(
        `INSERT INTO orders (
          user_id, order_number, payment_method, order_status, total_after_promotions_amount, order_final_discount_amount,
          final_amount, shipping_address_id, shipping_fee
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          authResult.user?.userId,
          order_number,
          data.payment_method || 'stripe',
          'pending',
          total_amount,
          order_final_discount_amount,
          final_amount,
          shipping_address_id,
          shipping_fee
        ]
      );

      const order_id = orderInsertResult.lastInsertRowid;

      // Create order items
      for (const item of items) {
        const promoInfo = itemPromoInfo.get(item.product_id);
        const unit_price = promoInfo ? promoInfo.promotionPrice : round2(parseFloat((await query('SELECT pp.price FROM product_prices pp WHERE pp.product_id = ? AND pp.currency = ?', [item.product_id, 'USD'])).rows[0].price) || 0);
        const itemPromotionDiscount = promoInfo ? round2(promoInfo.discountAmount * item.quantity) : 0;

        await query(
          `INSERT INTO order_items (order_id, product_id, quantity, specifications, original_price, promotion_ids, total_promotions_discount_amount)
           VALUES (?, ?, ?, '{}', ?, ?, ?)`,
          [
            order_id,
            item.product_id,
            item.quantity,
            promoInfo ? promoInfo.originalPrice : unit_price,
            promoInfo && promoInfo.promotionIds.length > 0 ? JSON.stringify(promoInfo.promotionIds) : null,
            itemPromotionDiscount
          ]
        );

        // Update inventory with optimistic lock (prevent overselling)
        // SQLite doesn't support FOR UPDATE, so we use conditional UPDATE
        // Step 1: Get current stock
        const beforeStockResult = await query(
          'SELECT quantity FROM inventory WHERE product_id = ?',
          [item.product_id]
        );
        const before_stock = beforeStockResult.rows[0]?.quantity || 0;

        // Step 2: Check if enough stock
        if (before_stock < item.quantity) {
          // Rollback transaction
          await query('ROLLBACK');
          return NextResponse.json(
            {
              success: false,
              error_code: 'INSUFFICIENT_STOCK',
              message: getMessageWithParams('INSUFFICIENT_STOCK', lang, { requested: item.quantity, available: before_stock }),
              message_en: getMessageWithParams('INSUFFICIENT_STOCK', 'en', { requested: item.quantity, available: before_stock }),
              message_ar: getMessageWithParams('INSUFFICIENT_STOCK', 'ar', { requested: item.quantity, available: before_stock }),
              failed_items: [{
                product_id: item.product_id,
                requested: item.quantity,
                available: before_stock
              }]
            },
            { status: 400 }
          );
        }

        // Step 3: Deduct stock with condition (optimistic lock)
        const updateResult = await query(
          'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND quantity >= ?',
          [item.quantity, item.product_id, item.quantity]
        );

        // Check if update was successful (changes > 0)
        if (!updateResult.changes || updateResult.changes === 0) {
          await query('ROLLBACK');
          return NextResponse.json(
            {
              success: false,
              error_code: 'INSUFFICIENT_STOCK',
              message: getMessageWithParams('INSUFFICIENT_STOCK', lang, { requested: item.quantity, available: before_stock }),
              message_en: getMessageWithParams('INSUFFICIENT_STOCK', 'en', { requested: item.quantity, available: before_stock }),
              message_ar: getMessageWithParams('INSUFFICIENT_STOCK', 'ar', { requested: item.quantity, available: before_stock }),
              failed_items: [{
                product_id: item.product_id,
                requested: item.quantity,
                available: before_stock
              }]
            },
            { status: 400 }
          );
        }

        // Get product name for transaction log
        const productInfo = await query('SELECT name FROM products WHERE id = ?', [item.product_id]);
        const product_name = productInfo.rows[0]?.name || 'Product';

        await createInventoryTransaction({
          productId: item.product_id,
          productName: product_name,
          transactionTypeCode: InventoryTransactionCode.ORDER_CREATE,
          quantityChange: -item.quantity,
          quantityBefore: before_stock,
          quantityAfter: before_stock - item.quantity,
          reason: `Order ${order_number}`,
          referenceType: 'order',
          referenceId: order_id,
          operatorId: authResult.user?.userId,
          operatorName: authResult.user?.name || authResult.user?.email,
        });
      }

      await query('COMMIT');

      logMonitor('ORDERS', 'SUCCESS', { 
        action: 'CREATE_ORDER', 
        orderId: order_id,
        orderNumber: order_number,
        totalAmount: total_amount,
        finalAmount: final_amount,
        itemCount: items.length
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            order_id,
            order_number,
            status: 'pending',
            total_amount,
            order_final_discount_amount,
            final_amount,
            shipping_fee
          }
        },
        { status: 201 }
      );
    } catch (error: any) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    logMonitor('ORDERS', 'ERROR', { action: 'CREATE_ORDER', error: error?.message || String(error) });
    console.error('Error creating order:', error);
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}

// PUT /api/orders - Update order status (admin only)
// 所有状态变更必须通过 OrderStatusService 进行校验
export async function PUT(request: NextRequest) {
  const lang = getLangFromRequest(request);
  try {
    logMonitor('ORDERS', 'REQUEST', { method: 'PUT', action: 'UPDATE_ORDER_STATUS' });
    
    // 验证管理员权限
    const adminResult = requireAdmin(request);
    if (adminResult.response) {
      return adminResult.response;
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');
    const body = await request.json();
    const { event } = body;

    if (!orderId || !event) {
      return createErrorResponse('MISSING_PARAMS', lang, 400);
    }

    // 通过 OrderStatusService 进行状态变更（校验状态转换是否合法）
    const result = await OrderStatusService.changeStatus(
      Number(orderId),
      event,
      { type: OperatorType.ADMIN, id: adminResult.user?.userId || 0, name: adminResult.user?.name || 'Admin' },
      { reason: 'admin_action' }
    );

    if (!result.success) {
      logMonitor('ORDERS', 'ERROR', { 
        action: 'UPDATE_ORDER_STATUS_FAILED', 
        orderId,
        event,
        error: result.error 
      });
      return createErrorResponse(result.error || 'STATUS_CHANGE_FAILED', lang, 400);
    }

    logMonitor('ORDERS', 'SUCCESS', { 
      action: 'UPDATE_ORDER_STATUS', 
      orderId,
      event,
      fromStatus: result.fromStatus,
      toStatus: result.toStatus
    });

    return NextResponse.json({
      success: true,
      data: { 
        id: orderId, 
        from_status: result.fromStatus,
        to_status: result.toStatus
      }
    });
  } catch (error: any) {
    logMonitor('ORDERS', 'ERROR', { action: 'UPDATE_ORDER_STATUS', error: error?.message || String(error) });
    console.error('Error updating order:', error);
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}
