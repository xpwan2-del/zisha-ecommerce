import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 商品详情管理
 * ============================================================
 *
 * @api {GET} /api/products/[id] 获取商品详情
 * @apiName GetProductById
 * @apiGroup PRODUCTS
 * @apiDescription 根据ID获取商品详细信息，包括库存、分类、评价等
 *
 * @api {PUT} /api/products/[id] 更新商品
 * @apiName UpdateProduct
 * @apiGroup PRODUCTS
 * @apiDescription 更新商品信息（需要管理员权限）
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} PRODUCT_NOT_FOUND 商品不存在
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

// 辅助函数：解析JSON字段
function parseJSON(value: any, defaultValue: any = []): any {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = parseInt(id, 10);

  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'GET',
    path: `/api/products/${productId}`
  });

  try {
    // 查询产品基本信息（JOIN inventory和inventory_status获取库存状态）
    const productResult = await query(
      `SELECT
        p.*,
        c.name as category_name,
        c.name_en as category_name_en,
        c.name_ar as category_name_ar,
        COALESCE(i.quantity, 0) as stock,
        i.status_id as stock_status_id,
        ins.id as status_id,
        ins.name as status_name,
        ins.name_en as status_name_en,
        ins.name_ar as status_name_ar,
        ins.color as status_color,
        ins.color_name as status_color_name,
        pp_usd.price as price_usd,
        pp_cny.price as price_cny,
        pp_aed.price as price_aed
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id
      LEFT JOIN inventory_status ins ON i.status_id = ins.id
      LEFT JOIN product_prices pp_usd ON p.id = pp_usd.product_id AND pp_usd.currency = 'USD'
      LEFT JOIN product_prices pp_cny ON p.id = pp_cny.product_id AND pp_cny.currency = 'CNY'
      LEFT JOIN product_prices pp_aed ON p.id = pp_aed.product_id AND pp_aed.currency = 'AED'
      WHERE p.id = ?`,
      [productId]
    );

    if (!productResult.rows || productResult.rows.length === 0) {
      logMonitor('PRODUCTS', 'NOT_FOUND', {
        reason: 'Product not found',
        productId
      });
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const row = productResult.rows[0];

    // 解析JSON字段
    const images = parseJSON(row.images, []);
    const features = parseJSON(row.features, []);
    const specifications = parseJSON(row.specifications, {});
    const shipping = parseJSON(row.shipping, {});
    const after_sale = parseJSON(row.after_sale, {});

    // 查询产品关联的活动分类（只返回有效且未过期的活动）
    const activitiesResult = await query(
      `SELECT ac.id, ac.name, ac.name_en, ac.name_ar, ac.icon_url, ac.color
       FROM product_activities pa
       JOIN activity_categories ac ON pa.activity_category_id = ac.id
       WHERE pa.product_id = ?
         AND pa.end_time > datetime('now')
         AND datetime(pa.start_time) <= datetime('now')
         AND ac.status = 'active'`,
      [productId]
    );
    const activities = activitiesResult.rows || [];

    // 查询产品的促销信息（单个最大折扣）
    const promotionResult = await query(
      `SELECT
        pp.id as product_promotion_id,
        pp.promotion_id,
        pp.original_price,
        pp.priority,
        pp.can_stack,
        pr.name as promotion_name,
        pr.name_en as promotion_name_en,
        pr.name_ar as promotion_name_ar,
        pr.discount_percent,
        pr.type as promotion_type,
        pr.icon as promotion_icon,
        pr.color as promotion_color,
        pp.start_time,
        pp.end_time
       FROM product_promotions pp
       JOIN promotions pr ON pp.promotion_id = pr.id
       WHERE pp.product_id = ? AND pp.end_time > datetime('now') AND datetime(pp.start_time) <= datetime('now')
       ORDER BY pp.priority ASC, pr.discount_percent DESC
       LIMIT 1`,
      [productId]
    );
    const promotion = promotionResult.rows?.[0] || null;

    // 查询所有促销信息（排除今日特惠和特惠商品）
    const allPromotionsResult = await query(
      `SELECT
        pp.id as product_promotion_id,
        pp.promotion_id,
        pp.priority,
        pp.can_stack,
        pr.name as promotion_name,
        pr.name_en as promotion_name_en,
        pr.name_ar as promotion_name_ar,
        pr.discount_percent,
        pr.type as promotion_type,
        pr.icon as promotion_icon,
        pr.color as promotion_color
       FROM product_promotions pp
       JOIN promotions pr ON pp.promotion_id = pr.id
       WHERE pp.product_id = ? AND pp.end_time > datetime('now') AND datetime(pp.start_time) <= datetime('now')
       ORDER BY pp.priority ASC, pr.discount_percent DESC`,
      [productId]
    );
    const allPromotions = (allPromotionsResult.rows || [])
      .filter((p: any) => {
        const hasExclusive = allPromotionsResult.rows?.some((r: any) => r.can_stack === 1);
        if (hasExclusive) {
          return p.can_stack === 1;
        }
        return true;
      })
      .map((p: any) => ({
        id: p.promotion_id,
        name: p.promotion_name,
        name_en: p.promotion_name_en,
        name_ar: p.promotion_name_ar,
        discount_percent: p.discount_percent,
        type: p.promotion_type,
        icon: p.promotion_icon,
        color: p.promotion_color,
        priority: p.priority,
        can_stack: p.can_stack,
        end_time: p.end_time
      }));

    // 计算总折扣和公式
    const calculateDiscount = (promos: any[]) => {
      if (promos.length === 0) return { discount: 0, formula: '' };

      const exclusive = promos.find(p => p.can_stack === 1);
      if (exclusive) {
        return {
          discount: exclusive.discount_percent,
          formula: `${exclusive.discount_percent}% (独占)`,
          multiplier: 1 - exclusive.discount_percent / 100
        };
      }

      const sortedPromos = [...promos].sort((a, b) => a.priority - b.priority);
      const parts: string[] = [];
      sortedPromos.forEach(p => {
        parts.push(`(1-${p.discount_percent}%)`);
      });
      const multiplier = sortedPromos.reduce((acc, p) => acc * (1 - p.discount_percent / 100), 1);
      const totalDiscount = Math.round((1 - multiplier) * 10000) / 100;
      return {
        discount: totalDiscount,
        multiplier: multiplier,
        formula: parts.join(' × ') + ` = ${totalDiscount}%`
      };
    };

    const discountInfo = calculateDiscount(allPromotions);

    // 查询评价统计
    const reviewResult = await query(
      `SELECT COUNT(*) as count, AVG(rating) as avg_rating
       FROM reviews
       WHERE product_id = ?`,
      [productId]
    );
    const reviewCount = parseInt(String(reviewResult.rows?.[0]?.count || 0));
    const avgRating = reviewResult.rows?.[0]?.avg_rating;
    const rating = avgRating ? parseFloat(String(avgRating)).toFixed(1) : '5.0';

    // 查询产品规格
    const featuresResult = await query(
      `SELECT 
        pf.id,
        pf.template_id,
        pf.value,
        pf.value_en,
        pf.value_ar,
        ft.name as field_name,
        ft.name_en as field_name_en,
        ft.name_ar as field_name_ar,
        ft.unit
      FROM product_features pf
      JOIN feature_templates ft ON pf.template_id = ft.id
      WHERE pf.product_id = ?
      ORDER BY pf."order"`,
      [productId]
    );
    const productFeatures = featuresResult.rows || [];

    // 查询库存历史（最近10条）
    const inventoryHistoryResult = await query(
      `SELECT
        id,
        transaction_type_id,
        quantity_change as quantity,
        quantity_before as before_stock,
        quantity_after as after_stock,
        reason,
        operator_name,
        created_at
       FROM inventory_transactions
       WHERE product_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [productId]
    );
    const inventoryHistory = inventoryHistoryResult.rows || [];

    // 查询产品操作日志（最近10条）
    const operationLogsResult = await query(
      `SELECT
        id,
        action,
        field_name,
        old_value,
        new_value,
        operator_name,
        ip_address,
        created_at
       FROM product_logs
       WHERE product_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [productId]
    );
    const operationLogs = operationLogsResult.rows || [];

    // 查询关联推荐产品（同分类的其他产品，排除当前产品）
    const relatedProductsResult = await query(
      `SELECT
        p.id, p.name, p.name_en, p.name_ar,
        p.image,
        c.name as category_name,
        pp_usd.price as price_usd,
        pp_cny.price as price_cny,
        pp_aed.price as price_aed
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_prices pp_usd ON p.id = pp_usd.product_id AND pp_usd.currency = 'USD'
       LEFT JOIN product_prices pp_cny ON p.id = pp_cny.product_id AND pp_cny.currency = 'CNY'
       LEFT JOIN product_prices pp_aed ON p.id = pp_aed.product_id AND pp_aed.currency = 'AED'
       WHERE p.category_id = ? AND p.id != ?
       ORDER BY p.id DESC
       LIMIT 4`,
      [row.category_id, id]
    );
    const relatedProducts = (relatedProductsResult.rows || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      name_en: p.name_en,
      name_ar: p.name_ar,
      price_usd: parseFloat(p.price_usd) || 0,
      price_cny: parseFloat(p.price_cny) || 0,
      price_aed: parseFloat(p.price_aed) || 0,
      image: p.image,
      category: { name: p.category_name }
    }));

    // 构建完整的产品详情数据
    const product = {
      id: row.id,
      name: row.name,
      name_en: row.name_en,
      name_ar: row.name_ar,
      description: row.description,
      description_en: row.description_en,
      description_ar: row.description_ar,
      price_usd: parseFloat(row.price_usd) || 0,
      price_cny: parseFloat(row.price_cny) || 0,
      price_aed: parseFloat(row.price_aed) || 0,
      original_price_usd: parseFloat(row.price_usd) || 0,
      original_price_cny: parseFloat(row.price_cny) || 0,
      original_price_aed: parseFloat(row.price_aed) || 0,
      stock: parseInt(row.stock) || 0,
      stock_status_id: row.stock_status_id || 1,
      stock_status_info: row.status_id ? {
        id: row.status_id,
        name: row.status_name,
        name_en: row.status_name_en,
        name_ar: row.status_name_ar,
        color: row.status_color,
        color_name: row.status_color_name
      } : null,
      image: row.image || (images.length > 0 ? images[0] : ''),
      images: images,
      video: row.video || '',
      parameters: {
        capacity: row.capacity || '',
        weight: row.weight || '',
        material: row.material || '',
        height: row.height || '',
        width: row.width || ''
      },
      features: features,
      specifications: specifications,
      shipping: shipping,
      after_sale: after_sale,
      is_limited: Boolean(row.is_limited),
      discount: parseInt(row.discount) || 0,
      display_mode: row.display_mode || 'double',
      category: {
        id: row.category_id,
        name: row.category_name,
        name_en: row.category_name_en,
        name_ar: row.category_name_ar
      },
      activities: activities,
      promotion: promotion && allPromotions.length > 0 ? {
        id: promotion.promotion_id,
        name: promotion.promotion_name,
        name_en: promotion.promotion_name_en,
        name_ar: promotion.promotion_name_ar,
        type: promotion.promotion_type,
        discount_percent: discountInfo.discount,
        calculation: discountInfo.formula,
        icon: promotion.promotion_icon,
        color: promotion.promotion_color,
        priority: promotion.priority,
        can_stack: promotion.can_stack,
        original_price_usd: parseFloat(row.price_usd),
        original_price_cny: parseFloat(row.price_cny),
        original_price_aed: parseFloat(row.price_aed),
        promotion_price_usd: parseFloat(row.price_usd) * discountInfo.multiplier,
        promotion_price_cny: parseFloat(row.price_cny) * discountInfo.multiplier,
        promotion_price_aed: parseFloat(row.price_aed) * discountInfo.multiplier,
        start_time: promotion.start_time,
        end_time: promotion.end_time
      } : null,
      promotions: allPromotions,
      review_count: reviewCount,
      rating: rating,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // 扩展数据
      inventory_history: inventoryHistory,
      operation_logs: operationLogs,
      related_products: relatedProducts,
      specifications_detail: productFeatures
    };

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'GET_PRODUCT_BY_ID',
      productId,
      productName: product.name,
      stock: product.stock
    });

    return NextResponse.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'GET_PRODUCT_BY_ID',
      productId,
      error: errorMessage
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product', details: errorMessage },
      { status: 500 }
    );
  }
}
