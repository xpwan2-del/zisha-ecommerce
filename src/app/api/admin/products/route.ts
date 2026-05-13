import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { createInventoryTransaction, InventoryTransactionCode } from '@/lib/inventory-transactions';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

function calcStatusId(qty: number): number {
  if (qty <= 0) return 4;
  if (qty <= 5) return 3;
  if (qty <= 10) return 2;
  return 1;
}

export async function GET(request: NextRequest) {
  logApiRequest('PRODUCTS', 'GET', '/api/admin/products');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sort = searchParams.get('sort') || 'newest';

    const whereConditions: string[] = [];
    const params: any[] = [];

    if (search) {
      whereConditions.push(`(
        p.name LIKE ? OR 
        p.name_en LIKE ? OR 
        p.name_ar LIKE ?
      )`);
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (categoryId) {
      whereConditions.push(`p.category_id = ?`);
      params.push(parseInt(categoryId, 10));
    }

    if (minPrice) {
      whereConditions.push(`pp_usd.price >= ?`);
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      whereConditions.push(`pp_usd.price <= ?`);
      params.push(parseFloat(maxPrice));
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let orderBy = 'ORDER BY p.id DESC';
    switch (sort) {
      case 'price_asc':
        orderBy = 'ORDER BY pp_usd.price ASC';
        break;
      case 'price_desc':
        orderBy = 'ORDER BY pp_usd.price DESC';
        break;
      case 'stock':
        orderBy = 'ORDER BY COALESCE(i.quantity, 0) DESC';
        break;
      case 'newest':
      default:
        orderBy = 'ORDER BY p.id DESC';
    }

    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as count FROM products p LEFT JOIN product_prices pp_usd ON p.id = pp_usd.product_id AND pp_usd.currency = 'USD' ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(String(countResult.rows?.[0]?.count || 0));

    const productsQuery = `
      SELECT 
        p.id, p.name, p.name_en, p.name_ar,
        pp_usd.price,
        p.image, p.category_id, p.is_limited, p.display_mode,
        COALESCE(p.publish_status, 'published') as publish_status,
        c.name as category_name,
        c.name_en as category_name_en,
        c.name_ar as category_name_ar,
        COALESCE(i.quantity, 0) as quantity,
        i.status_id as stock_status_id,
        ins.id as status_id,
        ins.name as status_name,
        ins.name_en as status_name_en,
        ins.name_ar as status_name_ar,
        ins.color as status_color,
        ins.color_name as status_color_name
      FROM products p
      LEFT JOIN product_prices pp_usd ON p.id = pp_usd.product_id AND pp_usd.currency = 'USD'
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id
      LEFT JOIN inventory_status ins ON i.status_id = ins.id
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const productsResult = await query(productsQuery, queryParams);
    const products = productsResult.rows || [];

    const productsWithRelations = await Promise.all(products.map(async (row: any) => {
      const productId = row.id;

      const promotionsResult = await query(`
        SELECT 
          pp.id as product_promotion_id,
          pp.promotion_id,
          pp.original_price,
          pp.priority,
          pp.can_stack,
          pr.name as name,
          pr.name_en as name_en,
          pr.name_ar as name_ar,
          pr.discount_percent,
          pr.type as promotion_type,
          pr.icon as promotion_icon,
          pr.color as promotion_color
        FROM product_promotions pp
        JOIN promotions pr ON pp.promotion_id = pr.id
        WHERE pp.product_id = ?
      `, [productId]);

      const activitiesResult = await query(`
        SELECT 
          pa.id as product_activity_id,
          pa.activity_category_id,
          ac.name,
          ac.name_en,
          ac.name_ar,
          ac.icon,
          ac.color
        FROM product_activities pa
        JOIN activity_categories ac ON pa.activity_category_id = ac.id
        WHERE pa.product_id = ?
      `, [productId]);

      return {
        id: row.id,
        name: row.name,
        name_en: row.name_en,
        name_ar: row.name_ar,
        price: row.price,
        image: row.image,
        category_id: row.category_id,
        category_name: row.category_name,
        category_name_en: row.category_name_en,
        category_name_ar: row.category_name_ar,
        is_limited: row.is_limited,
        display_mode: row.display_mode,
        publish_status: row.publish_status || 'published',
        quantity: row.quantity,
        stock_status_id: row.stock_status_id,
        stock_status_name: row.status_name,
        stock_status_name_en: row.status_name_en,
        stock_status_name_ar: row.status_name_ar,
        stock_status_color: row.status_color,
        promotions: promotionsResult.rows || [],
        activities: activitiesResult.rows || []
      };
    }));

    logApiSuccess('PRODUCTS', 'GET_ADMIN_PRODUCTS', {
      count: productsWithRelations.length,
      pagination: { page, limit, total }
    });

    return createSuccessResponse({
      products: productsWithRelations,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logApiError('PRODUCTS', 'GET_ADMIN_PRODUCTS', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  logApiRequest('PRODUCTS', 'POST', '/api/admin/products');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  const operatorName = auth.user.name || 'Admin';

  try {
    const body = await request.json();

    const {
      name,
      name_en,
      name_ar,
      price,
      price_usd,
      price_ae,
      category_id,
      quantity,
      description,
      description_en,
      description_ar,
      image,
      images,
      video,
      is_limited,
      display_mode,
      specifications,
      shipping,
      after_sale,
      promotions,
      activities
    } = body;

    if (!name || !name_en || !name_ar || !price || !category_id || quantity === undefined) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    if (price <= 0) {
      return createErrorResponse('INVALID_PRICE', 400);
    }

    if (quantity < 0) {
      return createErrorResponse('INVALID_QUANTITY', 400);
    }

    const categoryCheck = await query('SELECT id FROM categories WHERE id = ?', [category_id]);
    if (categoryCheck.rows.length === 0) {
      return createErrorResponse('CATEGORY_NOT_FOUND', 400);
    }

    await query('BEGIN TRANSACTION');

    try {
      const insertResult = await query(`
        INSERT INTO products (
          name, name_en, name_ar,
          description, description_en, description_ar,
          image, images, video,
          category_id, is_limited, display_mode,
          specifications, shipping, after_sale,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        name, name_en, name_ar,
        description || '', description_en || '', description_ar || '',
        image || '', JSON.stringify(images || []), video || '',
        category_id, is_limited || 0, display_mode || 'normal',
        specifications || '{}', shipping || '', after_sale || ''
      ]);

      const productId = Number(insertResult.lastInsertRowid);

      await query(`INSERT INTO product_prices (product_id, currency, price, created_at) VALUES (?, 'USD', ?, datetime('now'))`, [productId, price]);
      if (price_usd && price_usd != price) {
        await query(`INSERT INTO product_prices (product_id, currency, price, created_at) VALUES (?, 'USD', ?, datetime('now'))`, [productId, price_usd]);
      }
      await query(`INSERT INTO product_prices (product_id, currency, price, created_at) VALUES (?, 'AED', ?, datetime('now'))`, [productId, price_ae || price]);

      const statusId = calcStatusId(quantity);

      await query(`
        INSERT INTO inventory (product_id, product_name, quantity, status_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [productId, name, quantity, statusId]);

      await createInventoryTransaction({
        productId,
        productName: name,
        transactionTypeCode: InventoryTransactionCode.SELF_RESTOCK,
        quantityChange: quantity,
        quantityBefore: 0,
        quantityAfter: quantity,
        reason: '商品初始化',
        referenceType: 'admin_product_create',
        referenceId: productId,
        operatorId: null,
        operatorName: operatorName,
      });

      if (promotions && Array.isArray(promotions) && promotions.length > 0) {
        for (const promo of promotions) {
          await query(`
            INSERT INTO product_promotions (
              product_id, promotion_id, original_price,
              start_time, end_time, priority, can_stack, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [
            productId,
            promo.promotion_id,
            promo.original_price || price,
            promo.start_time || null,
            promo.end_time || null,
            promo.priority || 2,
            promo.can_stack !== undefined ? promo.can_stack : 1
          ]);
        }
      }

      if (activities && Array.isArray(activities) && activities.length > 0) {
        for (const activity of activities) {
          await query(`
            INSERT INTO product_activities (
              product_id, activity_category_id, start_time, end_time, created_at
            ) VALUES (?, ?, ?, ?, datetime('now'))
          `, [
            productId,
            activity.activity_category_id,
            activity.start_time || null,
            activity.end_time || null
          ]);
        }
      }

      await query(`
        INSERT INTO product_logs (
          product_id, action, field_name, new_value, operator_name, created_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [productId, 'create', 'product', JSON.stringify({ name, price }), operatorName]);

      await query('COMMIT');

      await recordAdminAuditLog({
        request,
        module: 'PRODUCTS',
        action: 'CREATE_PRODUCT',
        description: `创建商品 ${name}`,
        operator: operatorName,
        resourceId: productId,
        resourceType: 'product',
        riskLevel: 'high',
        metadata: {
          name, name_en, name_ar, price, category_id, quantity,
          promotionsCount: promotions?.length || 0,
          activitiesCount: activities?.length || 0,
        },
      });

      logApiSuccess('PRODUCTS', 'CREATE_ADMIN_PRODUCT', { productId, productName: name, quantity });

      return createSuccessResponse({
        id: productId,
        name,
        message: '商品创建成功'
      }, 201);

    } catch (txError) {
      await query('ROLLBACK');
      throw txError;
    }

  } catch (error) {
    logApiError('PRODUCTS', 'CREATE_ADMIN_PRODUCT', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
