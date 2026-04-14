import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';

// GET /api/orders - Get orders (user's own or all if admin)
export async function GET(request: NextRequest) {
  try {
    // 验证登录
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
        o.status,
        o.total_amount,
        o.discount_amount,
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
      params.push(authResult.user?.id);
    }

    if (status) {
      sql += params.length > 0 ? ' AND o.status = ?' : ' WHERE o.status = ?';
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
      countParams.push(authResult.user?.id);
    }

    if (status) {
      countSql += countParams.length > 0 ? ' AND status = ?' : ' WHERE status = ?';
      countParams.push(status);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult.rows[0]?.total || 0;

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
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    // 验证登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const data = await request.json();
    const { items, shipping_address_id, coupon_code } = data;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order items are required' },
        { status: 400 }
      );
    }

    // Calculate order total
    let total_amount = 0;

    // 存储每个商品的促销信息
    const itemPromoInfo: Map<number, { originalPrice: number, promotionPrice: number, promotionIds: number[], discountAmount: number }> = new Map();

    // 检查商品活动是否过期，并计算促销价格
    for (const item of items) {
      const promoCheck = await query(
        `SELECT pp.id, pp.promotion_id, pp.original_price, pr.name as promo_name, pr.discount_percent, pp.end_time, pp.can_stack, pp.priority
         FROM product_promotions pp
         JOIN promotions pr ON pp.promotion_id = pr.id
         WHERE pp.product_id = ? AND pp.status = 'active'`,
        [item.product_id]
      );

      if (promoCheck.rows && promoCheck.rows.length > 0) {
        const now = new Date();
        for (const promo of promoCheck.rows) {
          if (promo.end_time && new Date(promo.end_time) < now) {
            return NextResponse.json(
              {
                success: false,
                error: '活动已结束',
                message: `商品活动已结束，请返回商品页重新购买`,
                expired_promo: promo.promo_name
              },
              { status: 400 }
            );
          }
        }

        // 计算促销价格
        const promos = promoCheck.rows;
        const originalPrice = parseFloat(promos[0].original_price);

        // 按新逻辑计算：独占优先 or 叠加计算
        const exclusive = promos.find((p: any) => p.can_stack === 0 || p.can_stack === false);
        let multiplier = 1;
        if (exclusive) {
          multiplier = 1 - exclusive.discount_percent / 100;
        } else {
          promos.forEach((p: any) => {
            multiplier *= (1 - p.discount_percent / 100);
          });
        }
        const promotionPrice = originalPrice * multiplier;
        const promotionIds = promos.map((p: any) => p.id);
        const discountAmount = originalPrice - promotionPrice;

        itemPromoInfo.set(item.product_id, {
          originalPrice,
          promotionPrice,
          promotionIds,
          discountAmount
        });

        total_amount += promotionPrice * item.quantity;
      } else {
        // 没有促销，使用产品原价
        const productResult = await query('SELECT price FROM products WHERE id = ?', [item.product_id]);
        if (productResult.rows.length === 0) {
          return NextResponse.json(
            { success: false, error: `Product ${item.product_id} not found` },
            { status: 404 }
          );
        }
        const productPrice = parseFloat(productResult.rows[0].price);
        itemPromoInfo.set(item.product_id, {
          originalPrice: productPrice,
          promotionPrice: productPrice,
          promotionIds: [],
          discountAmount: 0
        });
        total_amount += productPrice * item.quantity;
      }
    }

    // Handle coupon
    let discount_amount = 0;
    if (coupon_code) {
      const couponResult = await query(
        'SELECT * FROM coupons WHERE code = ? AND is_active = true AND (expires_at IS NULL OR expires_at > datetime("now"))',
        [coupon_code]
      );
      if (couponResult.rows.length > 0) {
        const coupon = couponResult.rows[0];
        if (coupon.discount_type === 'percentage') {
          discount_amount = total_amount * (coupon.discount_value / 100);
        } else {
          discount_amount = coupon.discount_value;
        }
        if (coupon.max_discount && discount_amount > coupon.max_discount) {
          discount_amount = coupon.max_discount;
        }
      }
    }

    const shipping_fee = 0; // Free shipping for now
    const final_amount = total_amount - discount_amount + shipping_fee;

    // Generate order number
    const order_number = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Start transaction
    await query('BEGIN TRANSACTION');

    try {
      // Create order
      const orderResult = await query(
        `INSERT INTO orders (
          user_id, order_number, status, total_amount, discount_amount, 
          final_amount, shipping_address_id, shipping_fee
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [
          authResult.user?.id,
          order_number,
          'pending',
          total_amount,
          discount_amount,
          final_amount,
          shipping_address_id,
          shipping_fee
        ]
      );

      const order_id = orderResult.rows[0].id;

      // Create order items
      for (const item of items) {
        const promoInfo = itemPromoInfo.get(item.product_id);
        const unit_price = promoInfo ? promoInfo.promotionPrice : parseFloat((await query('SELECT price FROM products WHERE id = ?', [item.product_id])).rows[0].price);
        const item_total = unit_price * item.quantity;

        await query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, original_price, promotion_ids, discount_amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order_id,
            item.product_id,
            item.quantity,
            unit_price,
            item_total,
            promoInfo ? promoInfo.originalPrice : unit_price,
            promoInfo && promoInfo.promotionIds.length > 0 ? JSON.stringify(promoInfo.promotionIds) : null,
            promoInfo ? promoInfo.discountAmount * item.quantity : 0
          ]
        );

        // Update product stock
        await query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );

        // Record inventory log
        const productResult2 = await query('SELECT stock FROM products WHERE id = ?', [item.product_id]);
        const after_stock = productResult2.rows[0].stock;

        await query(
          `INSERT INTO inventory_logs (
            product_id, change_type, quantity, before_stock, after_stock, 
            reason, operator_id, operator_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.product_id,
            'order',
            -item.quantity,
            after_stock + item.quantity,
            after_stock,
            `Order ${order_number}`,
            authResult.user?.id,
            authResult.user?.name
          ]
        );
      }

      await query('COMMIT');

      return NextResponse.json(
        {
          success: true,
          data: {
            order_id,
            order_number,
            status: 'pending',
            total_amount,
            discount_amount,
            final_amount,
            shipping_fee
          }
        },
        { status: 201 }
      );
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

// PUT /api/orders - Update order status (admin only)
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员权限
    const adminResult = requireAdmin(request);
    if (adminResult.response) {
      return adminResult.response;
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');
    const body = await request.json();
    const { status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'Order ID and status are required' },
        { status: 400 }
      );
    }

    const result = await query(
      'UPDATE orders SET status = ? WHERE id = ? RETURNING id, order_number, status',
      [status, orderId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // 记录订单状态变更日志
    await query(
      `INSERT INTO order_status_logs (order_id, old_status, new_status, operator_name, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [orderId, result.rows[0].status, status, 'system']
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
