import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import {
  createInventoryTransaction,
  getInventoryTransactionTypeId,
  InventoryTransactionCode,
} from '@/lib/inventory-transactions';
import { logMonitor } from '@/lib/utils/logger';
import { getMessage } from '@/lib/messages';
import { applyPromotions } from '@/lib/pricing/cartPricing';
import { buildRoundedOrderAmounts, round2 } from '@/lib/pricing/orderAmountMath';

/**
 * ============================================================
 * 库存预扣 + 创建订单（立即购买）
 * ============================================================
 *
 * @api {POST} /api/inventory/reserve 预扣库存并创建订单
 * @apiName ReserveInventory
 * @apiGroup INVENTORY
 * @apiDescription 商品详情页点击"立即购买"时：
 *   1. 预扣库存
 *   2. 创建 pending 订单
 *   3. 返回 order_id 供快速订单页使用
 *
 * **业务逻辑：**
 * 1. 验证用户登录状态
 * 2. 检查商品库存是否充足
 * 3. 扣减库存并记录库存流水（transaction_type: sales_creat）
 * 4. 创建 pending 订单
 * 5. 返回 order_id，前端跳转支付页面
 *
 * **注意：**
 * - 此接口只预留库存，不创建正式订单
 * - 订单在用户完成支付后由支付回调正式创建
 * - 如果用户放弃支付，库存不会自动释放（需要定时任务清理）
 *
 * @apiHeader {String} Authorization Bearer Token 用户认证凭证
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)，可选，默认 zh
 *
 * @apiParam {Number} product_id 商品ID，必需
 * @apiParam {Number} quantity 预扣数量，必需，必须 > 0
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {Number} data.product_id 商品ID
 * @apiSuccess {Number} data.quantity 预扣数量
 * @apiSuccess {Number} data.order_id 订单ID
 * @apiSuccess {String} data.order_number 订单号
 * @apiSuccess {Number} data.stock_before 操作前库存
 * @apiSuccess {Number} data.stock_after 操作后库存
 * @apiSuccess {Number} data.transaction_type_id 库存流水类型ID
 * @apiSuccess {String} data.transaction_code 库存流水类型代码
 * @apiSuccess {Array} data.promotion_ids 关联的促销活动ID数组
 *
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "product_id": 2,
 *         "quantity": 3,
 *         "order_id": 15,
 *         "order_number": "QO1234567890123",
 *         "stock_before": 10,
 *         "stock_after": 7,
 *         "transaction_type_id": 1,
 *         "transaction_code": "sales_creat",
 *         "promotion_ids": [1, 3]
 *       }
 *     }
 *
 * @apiError {String} UNAUTHORIZED 未登录或Token无效
 * @apiError {String} MISSING_PARAMS 缺少必需参数
 * @apiError {String} VALIDATION_FAILED 参数校验失败
 * @apiError {String} NOT_FOUND 商品不存在
 * @apiError {String} INSUFFICIENT_STOCK 库存不足
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 *
 * @apiErrorExample {json} Error-Response:
 *     {
 *       "success": false,
 *       "error": "INSUFFICIENT_STOCK",
 *       "message": "库存不足，当前库存: 5",
 *       "requested": 10,
 *       "available": 5
 *     }
 */

// ============================================================
// 辅助函数
// ============================================================

/**
 * getLangFromRequest - 从请求获取语言设置
 * @description 优先从请求头 x-lang 获取，其次从 cookie 获取，默认 zh
 */
function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

/**
 * createErrorResponse - 创建统一错误响应
 * @param error 错误码
 * @param lang 语言
 * @param status HTTP 状态码
 */
function createErrorResponse(error: string, lang: string, status: number = 400) {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

/**
 * createSuccessResponse - 创建统一成功响应
 * @param data 返回数据
 * @param status HTTP 状态码
 */
function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

/**
 * calculateStockStatus - 计算库存状态
 * @param quantity 库存数量
 * @returns 状态ID：1=有货, 2=库存有限, 3=库存紧张, 4=缺货
 */
function calculateStockStatus(quantity: number): number {
  if (quantity <= 0) return 4;
  if (quantity <= 5) return 3;
  if (quantity <= 10) return 2;
  return 1;
}

// ============================================================
// POST - 预扣库存并创建订单
// ============================================================

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('INVENTORY', 'REQUEST', {
    method: 'POST',
    path: '/api/inventory/reserve',
    lang
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('INVENTORY', 'AUTH_FAILED', {
        reason: 'Unauthorized'
      });
      return authResult.response;
    }

    const body = await request.json();
    const { product_id, quantity } = body;
    const userId = authResult.user.userId;

    if (!product_id || !quantity) {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        reason: 'Missing required params: product_id, quantity',
        product_id,
        quantity
      });
      return createErrorResponse('MISSING_PARAMS', lang, 400);
    }

    if (quantity <= 0) {
      logMonitor('INVENTORY', 'VALIDATION_FAILED', {
        reason: 'Invalid quantity: must be greater than 0',
        quantity
      });
      return createErrorResponse('VALIDATION_FAILED', lang, 400);
    }

    logMonitor('INVENTORY', 'INFO', {
      action: 'RESERVE_INVENTORY',
      userId,
      productId: product_id,
      quantity
    });

    const productResult = await query(
      `SELECT p.id, p.name,
              COALESCE(i.quantity, 0) as stock,
              pp_usd.price as price_usd
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       LEFT JOIN product_prices pp_usd ON p.id = pp_usd.product_id AND pp_usd.currency = 'USD'
       WHERE p.id = ?`,
      [product_id]
    );

    if (productResult.rows.length === 0) {
      logMonitor('INVENTORY', 'NOT_FOUND', {
        product_id,
        reason: 'Product not found'
      });
      return createErrorResponse('NOT_FOUND', lang, 404);
    }

    const product = productResult.rows[0];
    const currentStock = product.stock || 0;

    if (currentStock < quantity) {
      logMonitor('INVENTORY', 'SUCCESS', {
        action: 'CHECK_STOCK',
        product_id,
        requested: quantity,
        available: currentStock,
        result: 'INSUFFICIENT'
      });
      return NextResponse.json(
        {
          success: false,
          error: 'INSUFFICIENT_STOCK',
          message: `库存不足，当前库存: ${currentStock}`,
          requested: quantity,
          available: currentStock
        },
        { status: 400 }
      );
    }

    const stockBefore = currentStock;

    const updateResult = await query(
      'UPDATE inventory SET quantity = quantity - ?, status_id = ? WHERE product_id = ? AND quantity >= ?',
      [
        quantity,
        calculateStockStatus(currentStock - quantity),
        product_id,
        quantity
      ]
    );

    if (updateResult.changes === 0) {
      logMonitor('INVENTORY', 'SUCCESS', {
        action: 'CHECK_STOCK_CONCURRENT',
        product_id,
        requested: quantity,
        available: currentStock,
        result: 'CONCURRENT_CONFLICT'
      });
      return NextResponse.json(
        {
          success: false,
          error: 'INSUFFICIENT_STOCK',
          message: `库存不足，当前库存已发生变化，请重新尝试`,
          requested: quantity,
          available: currentStock
        },
        { status: 400 }
      );
    }

    const transactionTypeId = await getInventoryTransactionTypeId(InventoryTransactionCode.ORDER_CREATE);

    await createInventoryTransaction({
      productId: product_id,
      productName: product.name,
      transactionTypeCode: InventoryTransactionCode.ORDER_CREATE,
      quantityChange: -quantity,
      quantityBefore: stockBefore,
      quantityAfter: stockBefore - quantity,
      reason: 'Buy Now - 立即购买',
      referenceType: 'buy_now',
      referenceId: null,
      operatorId: userId,
      operatorName: authResult.user?.name,
    });

    const activePromotionsResult = await query(
      `SELECT pp.promotion_id, pr.discount_percent, pp.can_stack
       FROM product_promotions pp
       JOIN promotions pr ON pp.promotion_id = pr.id
       WHERE pp.product_id = ?
         AND (pp.start_time IS NULL OR pp.start_time <= datetime('now'))
         AND (pp.end_time IS NULL OR pp.end_time >= datetime('now'))`,
      [product_id]
    );

    const promotionIds = activePromotionsResult.rows.map((row: any) => row.promotion_id);
    const promotionIdsJson = JSON.stringify(promotionIds);

    const originalPrice = round2(parseFloat(product.price_usd) || 0);
    const promotionResult = applyPromotions(originalPrice, activePromotionsResult.rows);
    const finalPrice = round2(promotionResult.finalPrice);
    const {
      totalOriginalPrice,
      totalAfterPromotionsAmount: totalAmount,
      productDiscountAmount: discountAmount,
      finalAmount,
    } = buildRoundedOrderAmounts({
      originalPrice,
      finalPrice,
      quantity,
    });

    const orderNumber = `ORD-${randomUUID()}`;

    const orderInsertResult = await query(
      `INSERT INTO orders (
        user_id, order_number, total_after_promotions_amount, total_original_price, shipping_fee,
        order_final_discount_amount, payment_method, payment_status, order_status,
        shipping_address_id, coupon_ids, total_coupon_discount, final_amount,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        userId,
        orderNumber,
        totalAmount,
        totalOriginalPrice,
        0,
        discountAmount,
        '',
        'pending',
        'pending',
        null,
        '[]',
        0,
        finalAmount,
        null
      ]
    );

    const orderId = orderInsertResult.lastInsertRowid;

    const productDiscount = discountAmount;

    await query(
      `INSERT INTO order_items (
        order_id, product_id, quantity, specifications, original_price, promotion_ids, total_promotions_discount_amount
      ) VALUES (?, ?, ?, '{}', ?, ?, ?)`,
      [
        orderId,
        product_id,
        quantity,
        originalPrice,
        promotionIdsJson,
        productDiscount
      ]
    );

    logMonitor('INVENTORY', 'SUCCESS', {
      action: 'RESERVE_INVENTORY',
      userId,
      productId: product_id,
      quantity,
      originalPrice,
      finalPrice,
      totalAmount,
      totalOriginalPrice,
      discountAmount,
      stockBefore,
      stockAfter: stockBefore - quantity,
      transactionCode: 'sales_creat',
      orderId,
      orderNumber,
      promotionIds
    });

    return createSuccessResponse({
      product_id,
      quantity,
      order_id: orderId,
      order_number: orderNumber,
      stock_before: stockBefore,
      stock_after: stockBefore - quantity,
      transaction_type_id: transactionTypeId,
      transaction_code: 'sales_creat',
      promotion_ids: promotionIds
    });

  } catch (error) {
    console.error('Error in inventory reserve:', error);
    logMonitor('INVENTORY', 'ERROR', {
      action: 'RESERVE_INVENTORY',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}