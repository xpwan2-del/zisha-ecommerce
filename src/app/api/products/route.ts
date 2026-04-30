import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 商品管理
 * ============================================================
 *
 * @api {GET} /api/products 获取商品列表
 * @apiName GetProducts
 * @apiGroup PRODUCTS
 * @apiDescription 获取商品列表，支持分页、筛选、搜索、排序
 *
 * @api {POST} /api/products 创建商品
 * @apiName CreateProduct
 * @apiGroup PRODUCTS
 * @apiDescription 创建新商品，包含库存初始化
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiParam {Number} [page] 页码，默认 1
 * @apiParam {Number} [limit] 每页数量，默认 12
 * @apiParam {String} [category_id] 分类ID
 * @apiParam {String} [search] 搜索关键词
 * @apiParam {String} [sort] 排序：newest|price_asc|price_desc|sales
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "products": [...],
 *         "pagination": { "page": 1, "limit": 12, "total": 100, "total_pages": 9 }
 *       }
 *     }
 *
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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '12');
  const category_id = url.searchParams.get('category_id');
  const activity_id = url.searchParams.get('activity_id');
  const promotion_id = url.searchParams.get('promotion_id');
  const search = url.searchParams.get('search');
  const min_price = url.searchParams.get('min_price');
  const max_price = url.searchParams.get('max_price');
  const sort = url.searchParams.get('sort') || 'newest';

  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'GET',
    path: '/api/products',
    query: { page, limit, category_id, search, sort }
  });

  try {
    let whereConditions: string[] = [];
    let params: any[] = [];

    // 基础筛选条件
    if (category_id && category_id !== 'all') {
      whereConditions.push('p.category_id = ?');
      params.push(category_id);
    }

    if (search) {
      whereConditions.push('(p.name LIKE ? OR p.name_en LIKE ? OR p.name_ar LIKE ? OR p.description LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (min_price) {
      whereConditions.push('p.price >= ?');
      params.push(parseFloat(min_price));
    }

    if (max_price) {
      whereConditions.push('p.price <= ?');
      params.push(parseFloat(max_price));
    }

    // 活动筛选 - 使用子查询
    if (activity_id) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM product_activities pa 
        WHERE pa.product_id = p.id AND pa.activity_category_id = ?
      )`);
      params.push(activity_id);
    }

    // 促销筛选 - 使用子查询
    if (promotion_id) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM product_promotions pp 
        WHERE pp.product_id = p.id AND pp.promotion_id = ? AND pp.end_time > datetime('now') AND datetime(pp.start_time) <= datetime('now')
      )`);
      params.push(promotion_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 排序逻辑
    let orderBy = 'ORDER BY p.id ASC';
    switch (sort) {
      case 'price_asc':
        orderBy = 'ORDER BY p.price ASC';
        break;
      case 'price_desc':
        orderBy = 'ORDER BY p.price DESC';
        break;
      case 'sales':
        orderBy = 'ORDER BY i.quantity DESC';
        break;
      case 'newest':
        orderBy = 'ORDER BY p.id ASC';
        break;
    }

    const offset = (page - 1) * limit;

    // 查询总数
    const countQuery = `SELECT COUNT(*) as count FROM products p ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(String(countResult.rows?.[0]?.count || 0));

    // 查询产品列表 - 关联所有需要的数据
    // 库存从 inventory 表读取（单一数据源）
    const productsQuery = `
      SELECT 
        p.id, p.name, p.name_en, p.name_ar,
        p.description, p.description_en, p.description_ar,
        p.image, p.images,
        p.category_id, p.created_at,
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
        pp_usd.price as price_usd
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id
      LEFT JOIN inventory_status ins ON i.status_id = ins.id
      LEFT JOIN product_prices pp_usd ON p.id = pp_usd.product_id AND pp_usd.currency = 'USD'
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;
    const queryParams = [...params, limit, offset];
    const productsResult = await query(productsQuery, queryParams);

    // 处理每个产品的关联数据
    const products = await Promise.all((productsResult.rows || []).map(async (row: any) => {
      const productId = row.id;

      // 解析JSON字段
      const images = parseJSON(row.images, []);

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

      // 查询产品的所有促销信息（包含priority和can_stack）
      const promotionsResult = await query(
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
          pr.color as promotion_color
         FROM product_promotions pp
         JOIN promotions pr ON pp.promotion_id = pr.id
         WHERE pp.product_id = ? 
           AND pp.end_time > datetime('now') AND datetime(pp.start_time) <= datetime('now')
         ORDER BY pp.priority ASC, pr.discount_percent DESC`,
        [productId]
      );
      const promotions = promotionsResult.rows || [];

      // 计算最终价格（按新逻辑：独占can_stack=1优先 or 叠加计算can_stack=0）
      const calculateFinalPrice = (originalPrice: number, promos: any[]) => {
        if (promos.length === 0) return originalPrice;

        // 检查是否有独占活动（can_stack=1）
        const exclusive = promos.find(p => p.can_stack === 1);
        if (exclusive) {
          // 有独占促销 → 直接使用独占促销折扣
          return originalPrice * (1 - exclusive.discount_percent / 100);
        }

        // 没有独占促销，按priority从小到大叠加
        const sortedPromos = [...promos].sort((a, b) => a.priority - b.priority);
        let multiplier = 1;
        sortedPromos.forEach(p => {
          multiplier *= (1 - p.discount_percent / 100);
        });
        return originalPrice * multiplier;
      };

      // 计算总折扣和公式（can_stack=1是独占，can_stack=0是可叠加）
      const calculateDiscount = (promos: any[]) => {
        if (promos.length === 0) return { discount: 0, formula: '', multiplier: 1 };

        // 检查是否有独占促销（can_stack=1）
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
          formula: parts.join(' × ') + ` = ${totalDiscount}%`,
          multiplier: multiplier
        };
      };

      const discountInfo = calculateDiscount(promotions);

      // 选择priority最小的作为主促销
      const mainPromo = promotions.length > 0 ? [...promotions].sort((a, b) => a.priority - b.priority)[0] : null;
      const finalPrice = mainPromo ? calculateFinalPrice(parseFloat(row.price), promotions) : parseFloat(row.price);

      const promotion = mainPromo ? {
        id: mainPromo.promotion_id,
        name: mainPromo.promotion_name,
        name_en: mainPromo.promotion_name_en,
        name_ar: mainPromo.promotion_name_ar,
        discount_percent: discountInfo.discount,
        calculation: discountInfo.formula,
        type: mainPromo.promotion_type,
        icon: mainPromo.promotion_icon,
        color: mainPromo.promotion_color,
        priority: mainPromo.priority,
        can_stack: mainPromo.can_stack,
        promotion_price: finalPrice,
        original_price: mainPromo.original_price || row.price
      } : null;

      // 返回促销（如果有独占只显示独占的，否则显示所有可叠加的）
      const hasExclusive = promotions.some(p => p.can_stack === 1);
      const allPromotions = promotions
        .filter((p: any) => !hasExclusive || p.can_stack === 1)
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
        can_stack: p.can_stack
      }));

      // 查询商品特性
      const featuresResult = await query(
        `SELECT 
          pf.id, pf.template_id, pf.value, pf.value_en, pf.value_ar,
          ft.name, ft.name_en, ft.name_ar
         FROM product_features pf
         JOIN feature_templates ft ON pf.template_id = ft.id
         WHERE pf.product_id = ?
         ORDER BY ft."order" ASC`,
        [productId]
      );
      const features = featuresResult.rows || [];

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

      // 构建返回数据 - 使用多货币价格
      return {
        id: productId,
        name: row.name,
        name_en: row.name_en,
        name_ar: row.name_ar,
        description: row.description,
        description_en: row.description_en,
        description_ar: row.description_ar,
        price_usd: parseFloat(row.price_usd) || 0,
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
        parameters: {
          capacity: features.find((f: any) => f.name === '容量')?.value || '',
          weight: features.find((f: any) => f.name === '重量')?.value || '',
          material: features.find((f: any) => f.name === '材质')?.value || '',
          height: features.find((f: any) => f.name === '高度')?.value || '',
          width: features.find((f: any) => f.name === '宽度')?.value || ''
        },
        features: features.map((feature: any) => ({
          id: feature.id,
          template_id: feature.template_id,
          name: feature.name,
          name_en: feature.name_en,
          name_ar: feature.name_ar,
          value: feature.value,
          value_en: feature.value_en,
          value_ar: feature.value_ar
        })),
        category: {
          id: row.category_id,
          name: row.category_name,
          name_en: row.category_name_en,
          name_ar: row.category_name_ar
        },
        activities: activities.map((activity: any) => ({
          id: activity.id,
          name: activity.name,
          name_en: activity.name_en,
          name_ar: activity.name_ar,
          icon_url: activity.icon_url,
          color: activity.color
        })),
        promotion: promotion ? {
          id: promotion.id,
          name: promotion.name,
          name_en: promotion.name_en,
          name_ar: promotion.name_ar,
          type: promotion.type,
          discount_percent: promotion.discount_percent,
          icon: promotion.icon,
          color: promotion.color,
          priority: promotion.priority,
          can_stack: promotion.can_stack,
          original_price: parseFloat(row.price),
          promotion_price: parseFloat(row.price) * (1 - promotion.discount_percent / 100)
        } : null,
        promotions: allPromotions.map((promo: any) => ({
          id: promo.id,
          name: promo.name,
          name_en: promo.name_en,
          name_ar: promo.name_ar,
          type: promo.type,
          discount_percent: promo.discount_percent,
          icon: promo.icon,
          color: promo.color,
          priority: promo.priority,
          can_stack: promo.can_stack
        })),
        review_count: reviewCount,
        rating: rating,
        created_at: row.created_at
      };
    }));

    const totalPages = Math.ceil(total / limit);

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'GET_PRODUCTS',
      productsCount: products.length,
      pagination: { page, limit, total, totalPages }
    });

    return NextResponse.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages
        }
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'GET_PRODUCTS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
