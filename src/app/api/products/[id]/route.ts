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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = parseInt(id, 10);

  try {
    // 自动更新过期活动状态
    await query(
      `UPDATE product_promotions 
       SET status = 'inactive' 
       WHERE status = 'active' AND end_time < datetime('now')`
    );

    // 查询产品基本信息
    const productResult = await query(
      `SELECT
        p.*,
        c.name as category_name,
        c.name_en as category_name_en,
        c.name_ar as category_name_ar
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?`,
      [productId]
    );

    if (!productResult.rows || productResult.rows.length === 0) {
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

    // 查询产品关联的活动分类
    const activitiesResult = await query(
      `SELECT ac.id, ac.name, ac.name_en, ac.name_ar, ac.icon_url
       FROM product_activities pa
       JOIN activity_categories ac ON pa.activity_category_id = ac.id
       WHERE pa.product_id = ?`,
      [productId]
    );
    const activities = activitiesResult.rows || [];

    // 查询产品的促销信息（单个最大折扣）
    const promotionResult = await query(
      `SELECT
        pp.id as product_promotion_id,
        pp.promotion_id,
        pp.original_price,
        pp.promotion_price,
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
       WHERE pp.product_id = ? AND pp.status = 'active' AND pr.status = 'active'
       ORDER BY pp.priority DESC, pr.discount_percent DESC
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
       WHERE pp.product_id = ? AND pp.status = 'active' AND pr.status = 'active'
       ORDER BY pp.priority DESC, pr.discount_percent DESC`,
      [productId]
    );
    const allPromotions = (allPromotionsResult.rows || [])
      .filter((p: any) => p.promotion_name !== '今日特惠' && p.promotion_name !== '特惠商品')
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

    // 查询库存变动历史（最近10条）
    const inventoryHistoryResult = await query(
      `SELECT
        id,
        change_type,
        quantity,
        before_stock,
        after_stock,
        reason,
        operator_name,
        created_at
       FROM inventory_logs
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
        p.price, p.original_price, p.image,
        c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
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
      price: parseFloat(p.price) || 0,
      original_price: parseFloat(p.original_price) || 0,
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
      price: parseFloat(row.price) || 0,
      original_price: parseFloat(row.original_price) || parseFloat(row.price) || 0,
      stock: parseInt(row.stock) || 0,
      stock_status: getStockStatus(parseInt(row.stock) || 0),
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
      promotion: promotion ? {
        id: promotion.promotion_id,
        name: promotion.promotion_name,
        name_en: promotion.promotion_name_en,
        name_ar: promotion.promotion_name_ar,
        type: promotion.promotion_type,
        discount_percent: promotion.discount_percent,
        icon: promotion.promotion_icon,
        color: promotion.promotion_color,
        priority: promotion.priority,
        can_stack: promotion.can_stack,
        original_price: parseFloat(promotion.original_price || row.price),
        promotion_price: parseFloat(promotion.promotion_price),
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

    return NextResponse.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const productId = parseInt(id, 10);
    const body = await request.json();

    const {
      name, name_en, name_ar,
      description, description_en, description_ar,
      price, original_price, stock,
      category_id, image, images, video,
      features, specifications, shipping, after_sale,
      is_limited, discount, capacity, weight, material, height, width
    } = body;

    // 获取旧数据用于日志记录
    const oldProductResult = await query(
      'SELECT name, price, stock FROM products WHERE id = ?',
      [productId]
    );
    const oldProduct = oldProductResult.rows?.[0];

    const result = await query(
      `UPDATE products SET
       name = ?, name_en = ?, name_ar = ?,
       description = ?, description_en = ?, description_ar = ?,
       price = ?, original_price = ?, stock = ?,
       category_id = ?, image = ?, images = ?, video = ?,
       features = ?, specifications = ?, shipping = ?, after_sale = ?,
       is_limited = ?, discount = ?,
       capacity = ?, weight = ?, material = ?, height = ?, width = ?,
       updated_at = datetime('now')
       WHERE id = ?`,
      [
        name, name_en, name_ar,
        description, description_en, description_ar,
        price, original_price || price, stock,
        category_id, image, JSON.stringify(images || []), video || '',
        JSON.stringify(features || []), JSON.stringify(specifications || {}),
        JSON.stringify(shipping || {}), JSON.stringify(after_sale || {}),
        is_limited ? 1 : 0, discount || 0,
        capacity, weight, material, height, width,
        id
      ]
    );

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // 记录操作日志
    await query(
      `INSERT INTO product_logs (
        product_id, action, field_name, old_value, new_value, operator_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        id,
        'update',
        'product',
        JSON.stringify({ name: oldProduct?.name, price: oldProduct?.price }),
        JSON.stringify({ name, price }),
        'system'
      ]
    );

    // 如果库存变化，记录库存日志
    if (oldProduct && parseInt(oldProduct.stock) !== parseInt(stock)) {
      await query(
        `INSERT INTO inventory_logs (
          product_id, change_type, quantity,
          before_stock, after_stock, reason, operator_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          id,
          'adjust',
          parseInt(stock) - parseInt(oldProduct.stock),
          parseInt(oldProduct.stock),
          parseInt(stock),
          '产品更新',
          'system'
        ]
      );
    }

    return NextResponse.json({
      success: true,
      data: { id, message: 'Product updated successfully' }
    });

  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const productId = parseInt(id, 10);

    // 记录删除日志
    await query(
      `INSERT INTO product_logs (
        product_id, action, field_name, old_value, operator_name, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [id, 'delete', 'product', JSON.stringify({ id }), 'system']
    );

    const result = await query(
      'DELETE FROM products WHERE id = ?',
      [productId]
    );

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Product deleted successfully' }
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
