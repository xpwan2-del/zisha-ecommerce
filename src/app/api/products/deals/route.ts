import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

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
  const sort = url.searchParams.get('sort') || 'end_time';

  try {
    const offset = (page - 1) * limit;

    let orderBy = 'ORDER BY pp.end_time ASC';
    if (sort === 'discount') {
      orderBy = 'ORDER BY pr.discount_percent DESC';
    } else if (sort === 'price_asc') {
      orderBy = 'ORDER BY p.price ASC';
    } else if (sort === 'price_desc') {
      orderBy = 'ORDER BY p.price DESC';
    } else if (sort === 'newest') {
      orderBy = 'ORDER BY p.id ASC';
    }

    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as count
      FROM products p
      JOIN product_promotions pp ON p.id = pp.product_id
      JOIN promotions pr ON pp.promotion_id = pr.id
      WHERE pp.end_time > datetime('now')
    `;
    const countResult = await query(countQuery);
    const total = parseInt(String(countResult.rows?.[0]?.count || 0));

    const productsQuery = `
      SELECT DISTINCT p.id
      FROM products p
      JOIN product_promotions pp ON p.id = pp.product_id
      JOIN promotions pr ON pp.promotion_id = pr.id
      WHERE pp.end_time > datetime('now')
      ${orderBy}
      LIMIT ? OFFSET ?
    `;
    const productsResult = await query(productsQuery, [limit, offset]);
    const productIds = (productsResult.rows || []).map((row: any) => row.id);

    if (productIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          products: [],
          pagination: {
            page,
            limit,
            total,
            totalPages: 0
          }
        }
      });
    }

    const placeholders = productIds.map(() => '?').join(',');
    const caseWhen = productIds.map((id: number, index: number) => `WHEN ${id} THEN ${index + 1}`).join(' ');
    const baseQuery = `
      SELECT
        p.id, p.name, p.name_en, p.name_ar,
        p.description, p.description_en, p.description_ar,
        p.price,
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
        ins.color_name as status_color_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id
      LEFT JOIN inventory_status ins ON i.status_id = ins.id
      WHERE p.id IN (${placeholders})
      ORDER BY CASE p.id ${caseWhen} END
    `;
    const baseParams = [...productIds];
    const baseResult = await query(baseQuery, baseParams);

    const products = await Promise.all((baseResult.rows || []).map(async (row: any) => {
      const productId = row.id;
      const images = parseJSON(row.images, []);

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

      const promotionsResult = await query(
        `SELECT 
          pp.id as product_promotion_id,
          pp.promotion_id,
          pp.original_price,
          pp.priority,
          pp.can_stack,
          pp.end_time,
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
           AND pp.end_time > datetime('now')
         ORDER BY pp.priority ASC`,
        [productId]
      );
      const promotions = promotionsResult.rows || [];

      const calculateFinalPrice = (originalPrice: number, promos: any[]) => {
        if (promos.length === 0) return originalPrice;
        const exclusive = promos.find(p => p.can_stack === 1);
        if (exclusive) {
          return originalPrice * (1 - exclusive.discount_percent / 100);
        }
        const sortedPromos = [...promos].sort((a, b) => a.priority - b.priority);
        let multiplier = 1;
        sortedPromos.forEach(p => {
          multiplier *= (1 - p.discount_percent / 100);
        });
        return originalPrice * multiplier;
      };

      const calculateDiscount = (promos: any[]) => {
        if (promos.length === 0) return { discount: 0, formula: '', multiplier: 1 };
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

      const allPromotions = promotions.map((p: any) => ({
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
      })).filter((p: any) => p.name !== '今日特惠' && p.name !== '特惠商品');

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

      const reviewResult = await query(
        `SELECT COUNT(*) as count, AVG(rating) as avg_rating
         FROM reviews
         WHERE product_id = ?`,
        [productId]
      );
      const reviewCount = parseInt(String(reviewResult.rows?.[0]?.count || 0));
      const avgRating = reviewResult.rows?.[0]?.avg_rating;
      const rating = avgRating ? parseFloat(String(avgRating)).toFixed(1) : '5.0';

      return {
        id: productId,
        name: row.name,
        name_en: row.name_en,
        name_ar: row.name_ar,
        description: row.description,
        description_en: row.description_en,
        description_ar: row.description_ar,
        price: parseFloat(row.price) || 0,
        original_price: parseFloat(row.price) || 0,
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
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}
