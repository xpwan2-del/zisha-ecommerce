import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

/**
 * @api {GET} /api/admin/products 获取商品列表（管理后台）
 * @apiName GetAdminProducts
 * @apiGroup AdminProducts
 * @apiDescription 获取管理后台商品列表，支持搜索、筛选、分页
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiParam {String} [search] 名称模糊搜索
 * @apiParam {Number} [categoryId] 分类ID
 * @apiParam {Number} [minPrice] 最低价格
 * @apiParam {Number} [maxPrice] 最高价格
 * @apiParam {Number} [page] 页码，默认1
 * @apiParam {Number} [limit] 每页数量，默认20
 * @apiParam {String} [sort] 排序：newest|price_asc|price_desc|stock
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": {
 *         "products": [...],
 *         "pagination": { "page": 1, "limit": 20, "total": 100, "total_pages": 5 }
 *       }
 *     }
 */

function getLangFromRequest(request: NextRequest): string {
  return request.headers.get('x-lang') ||
         request.cookies.get('locale')?.value ||
         'zh';
}

function createErrorResponse(error: string, lang: string, status: number = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

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

export async function GET(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('API', 'REQUEST', {
    method: 'GET',
    path: '/api/admin/products',
    query: Object.fromEntries(request.nextUrl.searchParams)
  });

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
      whereConditions.push(`p.price >= ?`);
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      whereConditions.push(`p.price <= ?`);
      params.push(parseFloat(maxPrice));
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let orderBy = 'ORDER BY p.id DESC';
    switch (sort) {
      case 'price_asc':
        orderBy = 'ORDER BY p.price ASC';
        break;
      case 'price_desc':
        orderBy = 'ORDER BY p.price DESC';
        break;
      case 'stock':
        orderBy = 'ORDER BY COALESCE(i.quantity, 0) DESC';
        break;
      case 'newest':
      default:
        orderBy = 'ORDER BY p.id DESC';
    }

    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as count FROM products p ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(String(countResult.rows?.[0]?.count || 0));

    const productsQuery = `
      SELECT 
        p.id, p.name, p.name_en, p.name_ar,
        p.price, p.price_usd, p.price_ae,
        p.image, p.category_id, p.is_limited, p.display_mode,
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
        price_usd: row.price_usd,
        price_ae: row.price_ae,
        image: row.image,
        category_id: row.category_id,
        category_name: row.category_name,
        category_name_en: row.category_name_en,
        category_name_ar: row.category_name_ar,
        is_limited: row.is_limited,
        display_mode: row.display_mode,
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

    logMonitor('API', 'SUCCESS', {
      action: 'GET_ADMIN_PRODUCTS',
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
    logMonitor('API', 'ERROR', {
      action: 'GET_ADMIN_PRODUCTS',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}

/**
 * @api {POST} /api/admin/products 新增商品
 * @apiName CreateAdminProduct
 * @apiGroup AdminProducts
 * @apiDescription 创建新商品，包含基本信息、库存、促销、活动关联
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 *
 * @apiParam {String} name 商品名称（中文），必需
 * @apiParam {String} name_en 商品名称（英文），必需
 * @apiParam {String} name_ar 商品名称（阿拉伯文），必需
 * @apiParam {Number} price 价格（AED），必需
 * @apiParam {Number} price_usd 价格（USD），必需
 * @apiParam {Number} price_ae 价格（AED），必需
 * @apiParam {Number} category_id 分类ID，必需
 * @apiParam {Number} quantity 库存数量，必需
 * @apiParam {String} [description] 商品描述
 * @apiParam {String} [image] 主图URL
 * @apiParam {Array} [images] 详情图URL数组
 * @apiParam {String} [video] 视频URL
 * @apiParam {Number} [is_limited] 是否限量（0=普通，1=限量）
 * @apiParam {String} [display_mode] 显示模式
 * @apiParam {String} [specifications] 规格参数（JSON字符串）
 * @apiParam {String} [shipping] 配送信息
 * @apiParam {String} [after_sale] 售后服务
 * @apiParam {Array} [promotions] 促销活动数组
 * @apiParam {Array} [activities] 活动标签数组
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 * @apiSuccessExample {json} Success-Response:
 *     {
 *       "success": true,
 *       "data": { "id": 1, "name": "经典石瓢壶", "message": "商品创建成功" }
 *     }
 */

export async function POST(request: NextRequest) {
  const lang = getLangFromRequest(request);

  logMonitor('API', 'REQUEST', {
    method: 'POST',
    path: '/api/admin/products'
  });

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
      logMonitor('API', 'VALIDATION_FAILED', {
        reason: 'Missing required fields',
        required: ['name', 'name_en', 'name_ar', 'price', 'category_id', 'quantity']
      });
      return createErrorResponse('MISSING_PARAMS', lang, 400);
    }

    if (price <= 0) {
      logMonitor('API', 'VALIDATION_FAILED', {
        reason: 'Invalid price',
        price
      });
      return createErrorResponse('INVALID_PRICE', lang, 400);
    }

    if (quantity < 0) {
      logMonitor('API', 'VALIDATION_FAILED', {
        reason: 'Invalid quantity',
        quantity
      });
      return createErrorResponse('INVALID_QUANTITY', lang, 400);
    }

    const categoryCheck = await query('SELECT id FROM categories WHERE id = ?', [category_id]);
    if (categoryCheck.rows.length === 0) {
      logMonitor('API', 'VALIDATION_FAILED', {
        reason: 'Category not found',
        category_id
      });
      return createErrorResponse('CATEGORY_NOT_FOUND', lang, 400);
    }

    const insertResult = await query(`
      INSERT INTO products (
        name, name_en, name_ar,
        description, description_en, description_ar,
        price, price_usd, price_ae,
        image, images, video,
        category_id, is_limited, display_mode,
        specifications, shipping, after_sale,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      name, name_en, name_ar,
      description || '', description_en || '', description_ar || '',
      price, price_usd || price, price_ae || price,
      image || '', JSON.stringify(images || []), video || '',
      category_id, is_limited || 0, display_mode || 'normal',
      specifications || '{}', shipping || '', after_sale || ''
    ]);

    const productId = insertResult.lastInsertRowid;

    const calcStatusId = (qty: number) => {
      if (qty <= 0) return 4;
      if (qty <= 5) return 3;
      if (qty <= 10) return 2;
      return 1;
    };
    const statusId = calcStatusId(quantity);

    await query(`
      INSERT INTO inventory (product_id, product_name, quantity, status_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [productId, name, quantity, statusId]);

    const typeResult = await query('SELECT id FROM transaction_type WHERE code = ?', ['self_estock']);
    const transactionTypeId = typeResult.rows[0]?.id || 14;

    await query(`
      INSERT INTO inventory_transactions (
        product_id, product_name, transaction_type_id, quantity_change,
        quantity_before, quantity_after, reason, operator_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [productId, name, transactionTypeId, quantity, 0, quantity, '商品初始化', 'admin']);

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
    `, [productId, 'create', 'product', JSON.stringify({ name, price }), 'admin']);

    logMonitor('API', 'SUCCESS', {
      action: 'CREATE_ADMIN_PRODUCT',
      productId,
      productName: name,
      quantity
    });

    return createSuccessResponse({
      id: productId,
      name,
      message: '商品创建成功'
    }, 201);

  } catch (error) {
    logMonitor('API', 'ERROR', {
      action: 'CREATE_ADMIN_PRODUCT',
      error: String(error)
    });
    return createErrorResponse('INTERNAL_ERROR', lang, 500);
  }
}