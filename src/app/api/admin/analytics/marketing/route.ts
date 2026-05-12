import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('ANALYTICS', 'GET', '/api/admin/analytics/marketing');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const promotionStats = await query(`
      SELECT 
        p.id,
        p.name,
        p.type,
        p.discount_percent,
        p.status,
        (SELECT COUNT(*) FROM product_promotions WHERE promotion_id = p.id) as product_count
      FROM promotions p
      ORDER BY p.id DESC
    `);

    const couponStats = await query(`
      SELECT 
        c.id,
        c.code,
        c.name,
        c.type as discount_type,
        c.value as discount_value,
        c.usage_limit,
        COALESCE(uc.used_count, 0) as used_count,
        COALESCE(cuc.total_coupon_discount, 0) as total_coupon_discount,
        COALESCE(cuc.order_count, 0) as order_count
      FROM coupons c
      LEFT JOIN (
        SELECT coupon_id, COUNT(*) as used_count
        FROM user_coupons
        WHERE status = 'used'
        GROUP BY coupon_id
      ) uc ON c.id = uc.coupon_id
      LEFT JOIN (
        SELECT 
          coupon_id,
          SUM(total_coupon_discount) as total_coupon_discount,
          COUNT(*) as order_count
        FROM coupon_usage_stats
        GROUP BY coupon_id
      ) cuc ON c.id = cuc.coupon_id
      ORDER BY COALESCE(uc.used_count, 0) DESC
    `);

    const summary = await query(`
      SELECT 
        (SELECT COUNT(*) FROM promotions WHERE status = 'active') as active_promotions,
        (SELECT COUNT(*) FROM coupons WHERE is_active = 1) as active_coupons,
        (SELECT COALESCE(SUM(total_coupon_discount), 0) FROM coupon_usage_stats) as total_coupon_discount,
        0 as total_promotion_discount
    `);

    const topPromotions = promotionStats.rows.slice(0, 5).map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      discount_percent: r.discount_percent,
      status: r.status,
      total_orders: 0,
      total_discount: 0,
      total_revenue: 0,
      product_count: Number(r.product_count),
    }));

    const topCoupons = couponStats.rows.slice(0, 5).map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      discount_type: r.discount_type,
      discount_value: r.discount_value,
      usage_limit: r.usage_limit,
      used_count: Number(r.used_count),
      total_coupon_discount: Number(r.total_coupon_discount),
      order_count: Number(r.order_count),
    }));

    const summaryRow = summary.rows[0] || {};

    logApiSuccess('ANALYTICS', 'GET');
    return NextResponse.json({
      success: true,
      data: {
        promotions: topPromotions,
        coupons: topCoupons,
        summary: {
          active_promotions: Number(summaryRow.active_promotions || 0),
          active_coupons: Number(summaryRow.active_coupons || 0),
          total_coupon_discount: Number(summaryRow.total_coupon_discount || 0),
          total_promotion_discount: Number(summaryRow.total_promotion_discount || 0),
        },
      },
    });
  } catch (error: any) {
    logApiError('ANALYTICS', 'GET', error);
    return createErrorResponse('MARKETING_ANALYTICS_FAILED', 500);
  }
}
