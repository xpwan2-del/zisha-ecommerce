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
  const type = url.searchParams.get('type') || 'all';
  
  const now = new Date().toISOString();
  
  try {
    // 自动更新过期活动状态
    await query(
      `UPDATE product_promotions 
       SET status = 'inactive' 
       WHERE status = 'active' AND end_time < datetime('now')`
    );

    let products: any[] = [];
    let total = 0;
    
    // Flash Sale: 查询 type='special' 的促销活动
    if (type === 'all' || type === 'flash_sale') {
      const flashSaleOffset = type === 'flash_sale' ? (page - 1) * limit : 0;
      const flashSaleLimit = type === 'flash_sale' ? limit : 100;
      const flashSaleResult = await query(
        `SELECT DISTINCT p.*, 
          COALESCE(p.category_id, 0) as category_id,
          pr.discount_percent,
          pr.name as promotion_name,
          pr.icon as promotion_icon,
          pr.color as promotion_color
         FROM products p 
         JOIN product_promotions pp ON p.id = pp.product_id
         JOIN promotions pr ON pp.promotion_id = pr.id
         WHERE pr.type = 'special' 
           AND pr.status = 'active' 
           AND pp.status = 'active'
         ORDER BY pr.discount_percent DESC
         LIMIT ? OFFSET ?`,
        [flashSaleLimit, flashSaleOffset]
      );
      const flashSaleProducts = flashSaleResult.rows || [];
      
      products = [...products, ...flashSaleProducts.map((p: any) => ({
        ...p,
        deal_type: 'flash_sale'
      }))];
      total += flashSaleProducts.length;
    }
    
    // Daily Deals: 查询 type='daily' 的促销活动
    if (type === 'all' || type === 'daily_deals') {
      const dailyOffset = type === 'daily_deals' ? (page - 1) * limit : 0;
      const dailyLimit = type === 'daily_deals' ? limit : 100;
      const dailyDealsResult = await query(
        `SELECT DISTINCT p.*, 
          COALESCE(p.category_id, 0) as category_id,
          pr.discount_percent,
          pr.name as promotion_name,
          pr.icon as promotion_icon,
          pr.color as promotion_color
         FROM products p 
         JOIN product_promotions pp ON p.id = pp.product_id
         JOIN promotions pr ON pp.promotion_id = pr.id
         WHERE pr.type = 'daily' 
           AND pr.status = 'active' 
           AND pp.status = 'active'
         ORDER BY pr.discount_percent DESC
         LIMIT ? OFFSET ?`,
        [dailyLimit, dailyOffset]
      );
      const dailyProducts = dailyDealsResult.rows || [];
      
      products = [...products, ...dailyProducts.map((p: any) => ({
        ...p,
        deal_type: 'daily_deals'
      }))];
      total += dailyProducts.length;
    }
    
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedProducts = products.slice(startIndex, startIndex + limit);
    
    const processedProducts = paginatedProducts.map((product: any) => {
      const row = product;
      return {
        id: row.id,
        name: row.name,
        name_en: row.name_en,
        name_ar: row.name_ar,
        price: parseFloat(row.price),
        price_usd: parseFloat(row.price_usd || 0),
        price_ae: parseFloat(row.price_ae || 0),
        original_price: parseFloat(row.original_price || row.price || 0),
        discount: row.discount_percent || 0,
        is_limited: row.is_limited || false,
        stock: row.stock || 0,
        image: row.image,
        images: parseJSON(row.images || []),
        category_id: row.category_id,
        deal_type: row.deal_type,
        promotion: row.promotion_name ? {
          name: row.promotion_name,
          discount_percent: row.discount_percent,
          icon: row.promotion_icon,
          color: row.promotion_color
        } : null,
        rating: 0,
        review_count: 0,
        created_at: row.created_at
      };
    });
    
    return NextResponse.json({
      success: true,
      data: {
        products: processedProducts,
        pagination: {
          page,
          limit,
          total,
          totalPages
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