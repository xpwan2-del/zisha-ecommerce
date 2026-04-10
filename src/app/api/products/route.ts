import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 辅助函数：计算库存状态
function getStockStatus(stock: number): string {
  if (stock <= 0) return '缺货';
  if (stock <= 5) return '紧张';
  if (stock <= 20) return '有限';
  return '充足';
}

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
        WHERE pp.product_id = p.id AND pp.promotion_id = ? AND pp.status = 'active'
      )`);
      params.push(promotion_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 排序逻辑
    let orderBy = 'ORDER BY p.id DESC';
    switch (sort) {
      case 'price_asc':
        orderBy = 'ORDER BY p.price ASC';
        break;
      case 'price_desc':
        orderBy = 'ORDER BY p.price DESC';
        break;
      case 'sales':
        orderBy = 'ORDER BY p.stock DESC';
        break;
      case 'newest':
        orderBy = 'ORDER BY p.id DESC';
        break;
    }

    const offset = (page - 1) * limit;

    // 查询总数
    const countQuery = `SELECT COUNT(*) as count FROM products p ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(String(countResult.rows?.[0]?.count || 0));

    // 查询产品列表 - 关联所有需要的数据
    const productsQuery = `
      SELECT 
        p.id, p.name, p.name_en, p.name_ar,
        p.description, p.description_en, p.description_ar,
        p.price, p.original_price, p.stock,
        p.image, p.images,
        p.category_id, p.created_at,
        c.name as category_name,
        c.name_en as category_name_en,
        c.name_ar as category_name_ar
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
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

      // 查询产品关联的活动分类
      const activitiesResult = await query(
        `SELECT ac.id, ac.name, ac.name_en, ac.name_ar, ac.icon_url, ac.color
         FROM product_activities pa
         JOIN activity_categories ac ON pa.activity_category_id = ac.id
         WHERE pa.product_id = ?`,
        [productId]
      );
      const activities = activitiesResult.rows || [];

      // 查询产品的所有促销信息
      const promotionsResult = await query(
        `SELECT 
          pp.id as product_promotion_id,
          pp.promotion_id,
          pp.original_price,
          pp.promotion_price,
          pr.name as promotion_name,
          pr.name_en as promotion_name_en,
          pr.name_ar as promotion_name_ar,
          pr.discount_percent,
          pr.type as promotion_type
         FROM product_promotions pp
         JOIN promotions pr ON pp.promotion_id = pr.id
         WHERE pp.product_id = ? AND pp.status = 'active' AND pr.status = 'active'
         ORDER BY pr.discount_percent DESC`,
        [productId]
      );
      const promotions = promotionsResult.rows || [];

      // 选择最大折扣的促销作为主促销
      const promotion = promotions.length > 0 ? promotions[0] : null;

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

      // 构建返回数据
      return {
        id: productId,
        name: row.name,
        name_en: row.name_en,
        name_ar: row.name_ar,
        description: row.description,
        description_en: row.description_en,
        description_ar: row.description_ar,
        price: parseFloat(row.price) || 0,
        original_price: parseFloat(row.original_price) || parseFloat(row.price) || 0,
        stock: parseInt(row.stock) || 0,
        stock_status: getStockStatus(parseInt(row.stock) || 0),
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
          id: promotion.promotion_id,
          product_promotion_id: promotion.product_promotion_id,
          name: promotion.promotion_name,
          name_en: promotion.promotion_name_en,
          name_ar: promotion.promotion_name_ar,
          type: promotion.promotion_type,
          discount_percent: promotion.discount_percent,
          original_price: parseFloat(promotion.original_price),
          promotion_price: parseFloat(promotion.promotion_price)
        } : null,
        promotions: promotions.map((promo: any) => ({
          id: promo.promotion_id,
          product_promotion_id: promo.product_promotion_id,
          name: promo.promotion_name,
          name_en: promo.promotion_name_en,
          name_ar: promo.promotion_name_ar,
          type: promo.promotion_type,
          discount_percent: promo.discount_percent,
          original_price: parseFloat(promo.original_price),
          promotion_price: parseFloat(promo.promotion_price)
        })),
        review_count: reviewCount,
        rating: rating,
        created_at: row.created_at
      };
    }));

    const totalPages = Math.ceil(total / limit);

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
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST - 创建新产品
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name, name_en, name_ar,
      description, description_en, description_ar,
      price, original_price, stock,
      category_id, image, images,
      features = []
    } = body;

    const result = await query(
      `INSERT INTO products (
        name, name_en, name_ar,
        description, description_en, description_ar,
        price, original_price, stock,
        category_id, image, images,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        name, name_en, name_ar,
        description, description_en, description_ar,
        price, original_price || price, stock || 0,
        category_id, image, JSON.stringify(images || [])
      ]
    );

    // 记录库存初始化日志
    const productId = result.lastID;
    await query(
      `INSERT INTO inventory_logs (
        product_id, change_type, quantity,
        before_stock, after_stock, reason, operator_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [productId, 'init', stock || 0, 0, stock || 0, '产品初始化', 'system']
    );

    // 记录产品创建日志
    await query(
      `INSERT INTO product_logs (
        product_id, action, field_name, new_value, operator_name, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [productId, 'create', 'product', JSON.stringify({ name, price }), 'system']
    );

    // 创建商品特性
    for (const feature of features) {
      await query(
        `INSERT INTO product_features (
          product_id, template_id, value, value_en, value_ar, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [productId, feature.template_id, feature.value, feature.value_en || feature.value, feature.value_ar || feature.value]
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: productId, message: 'Product created successfully' }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
