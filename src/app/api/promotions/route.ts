import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/promotions - Get all promotions with products
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const withProducts = url.searchParams.get('with_products') === 'true';
    const activeOnly = url.searchParams.get('active_only') === 'true';

    let whereClause = '';
    if (activeOnly) {
      whereClause = "WHERE p.status = 'active' AND p.start_time <= datetime('now') AND p.end_time >= datetime('now')";
    }

    // 查询所有促销活动
    const promotionsResult = await query(`
      SELECT
        p.id, p.name, p.name_en, p.name_ar,
        p.type, p.discount_percent,
        p.start_time, p.end_time, p.status,
        p.description, p.created_at, p.updated_at
      FROM promotions p
      ${whereClause}
      ORDER BY p.discount_percent DESC, p.created_at DESC
    `);

    const promotions = promotionsResult.rows || [];

    // 如果需要产品信息，查询每个促销关联的产品
    if (withProducts) {
      const promotionsWithProducts = await Promise.all(
        promotions.map(async (promotion: any) => {
          // 查询该促销关联的产品
          const productsResult = await query(
            `SELECT
              pp.id as product_promotion_id,
              pp.product_id,
              p.price as original_price,
              pp.status as bind_status,
              p.name as product_name,
              p.name_en as product_name_en,
              p.image,
              COALESCE(i.quantity, 0) as stock,
              i.status_id as stock_status_id,
              ins.id as status_id,
              ins.name as status_name,
              ins.name_en as status_name_en,
              ins.name_ar as status_name_ar,
              ins.color as status_color,
              ins.color_name as status_color_name,
              pr.discount_percent
            FROM product_promotions pp
            JOIN products p ON pp.product_id = p.id
            JOIN promotions pr ON pp.promotion_id = pr.id
            LEFT JOIN inventory i ON p.id = i.product_id
            LEFT JOIN inventory_status ins ON i.status_id = ins.id
            WHERE pp.promotion_id = ? AND pp.end_time > datetime('now') AND datetime(pp.start_time) <= datetime('now')
            ORDER BY pp.created_at DESC`,
            [promotion.id]
          );

          const products = (productsResult.rows || []).map((prod: any) => {
            const originalPrice = parseFloat(prod.original_price);
            const promoPrice = originalPrice * (1 - prod.discount_percent / 100);
            return {
              product_promotion_id: prod.product_promotion_id,
              product_id: prod.product_id,
              name: prod.product_name,
              name_en: prod.product_name_en,
              image: prod.image,
              stock: prod.stock,
              stock_status_id: prod.stock_status_id,
              stock_status_info: prod.status_id ? {
                id: prod.status_id,
                name: prod.status_name,
                name_en: prod.status_name_en,
                name_ar: prod.status_name_ar,
                color: prod.status_color,
                color_name: prod.status_color_name
              } : null,
              original_price: originalPrice,
              promotion_price: promoPrice,
              discount_amount: originalPrice - promoPrice
            };
          });

          // 计算统计信息
          const stats = {
            total_products: products.length,
            total_original_price: products.reduce((sum: number, p: any) => sum + p.original_price, 0),
            total_promotion_price: products.reduce((sum: number, p: any) => sum + p.promotion_price, 0),
            total_discount: products.reduce((sum: number, p: any) => sum + p.discount_amount, 0),
            avg_discount_percent: promotion.discount_percent
          };

          return {
            ...promotion,
            products,
            stats
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: promotionsWithProducts
      });
    }

    return NextResponse.json({
      success: true,
      data: promotions
    });

  } catch (error) {
    console.error('Error getting promotions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get promotions' },
      { status: 500 }
    );
  }
}

// POST /api/promotions - Create new promotion
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      name, name_en, name_ar,
      type, discount_percent,
      start_time, end_time,
      description, status = 'active'
    } = data;

    const result = await query(
      `INSERT INTO promotions (
        name, name_en, name_ar,
        type, discount_percent,
        start_time, end_time,
        description, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      RETURNING id`,
      [
        name, name_en, name_ar,
        type, discount_percent,
        start_time, end_time,
        description, status
      ]
    );

    const promotionId = result.rows[0]?.id;

    // 记录活动日志
    await query(
      `INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        'promotion',
        'create',
        promotionId,
        name,
        JSON.stringify({ name, type, discount_percent, start_time, end_time }),
        'system'
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: promotionId,
        name, name_en, name_ar,
        type, discount_percent,
        start_time, end_time,
        description, status
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create promotion' },
      { status: 500 }
    );
  }
}

// PUT /api/promotions - Update promotion
export async function PUT(request: NextRequest) {
  try {
    const {
      id, name, name_en, name_ar,
      type, discount_percent,
      start_time, end_time,
      description, status
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Promotion ID is required' },
        { status: 400 }
      );
    }

    // 获取旧数据用于日志
    const oldPromotionResult = await query(
      'SELECT name FROM promotions WHERE id = ?',
      [id]
    );
    const oldName = oldPromotionResult.rows?.[0]?.name;

    const updateResult = await query(
      `UPDATE promotions SET
        name = ?, name_en = ?, name_ar = ?,
        type = ?, discount_percent = ?,
        start_time = ?, end_time = ?,
        description = ?, status = ?,
        updated_at = datetime('now')
       WHERE id = ?
       RETURNING id`,
      [
        name, name_en, name_ar,
        type, discount_percent,
        start_time, end_time,
        description, status, id
      ]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Promotion not found' },
        { status: 404 }
      );
    }

    // 记录活动日志
    await query(
      `INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        'promotion',
        'update',
        id,
        name,
        JSON.stringify({ old_name: oldName, new_name: name, discount_percent, status }),
        'system'
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        id, name, name_en, name_ar,
        type, discount_percent,
        start_time, end_time,
        description, status
      }
    });

  } catch (error) {
    console.error('Error updating promotion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update promotion' },
      { status: 500 }
    );
  }
}

// DELETE /api/promotions - Delete promotion
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Promotion ID is required' },
        { status: 400 }
      );
    }

    // 获取促销名称用于日志
    const promotionResult = await query(
      'SELECT name FROM promotions WHERE id = ?',
      [id]
    );
    const promotionName = promotionResult.rows?.[0]?.name;

    // 先删除关联的产品促销关系
    await query('DELETE FROM product_promotions WHERE promotion_id = ?', [id]);

    // 记录活动日志
    await query(
      `INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        'promotion',
        'delete',
        id,
        promotionName || 'Unknown',
        JSON.stringify({ promotion_id: id }),
        'system'
      ]
    );

    const deleteResult = await query('DELETE FROM promotions WHERE id = ? RETURNING id', [id]);

    if (deleteResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Promotion not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Promotion deleted successfully' }
    });

  } catch (error) {
    console.error('Error deleting promotion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete promotion' },
      { status: 500 }
    );
  }
}
