import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {GET} /api/product-activities 获取商品活动
 * @apiName GetProductActivities
 * @apiGroup ACTIVITIES
 * @apiDescription 获取商品关联的活动列表。
 */


export async function GET(request: NextRequest) {
  try {
    logMonitor('PRODUCT_ACTIVITIES', 'REQUEST', { method: 'GET', action: 'GET_PRODUCT_ACTIVITIES' });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json([]);
    }

    const sql = `
      SELECT
        ac.id,
        ac.name,
        ac.name_en,
        ac.name_ar,
        ac.icon_url,
        ac.color
      FROM product_activities pa
      JOIN activity_categories ac ON pa.activity_category_id = ac.id
      WHERE pa.product_id = ?
        AND pa.end_time > datetime('now')
        AND datetime(pa.start_time) <= datetime('now')
        AND ac.status = 'active'
      ORDER BY ac.id
    `;

    const result = await query(sql, [productId]);
    const activities = result.rows || [];

    const formattedActivities = activities.map((activity: any) => ({
      id: activity.id,
      name: activity.name,
      name_en: activity.name_en,
      name_ar: activity.name_ar,
      icon_url: activity.icon_url,
      color: activity.color
    }));

    logMonitor('PRODUCT_ACTIVITIES', 'SUCCESS', { action: 'GET_PRODUCT_ACTIVITIES', product_id: productId, count: formattedActivities.length });
    return NextResponse.json(formattedActivities);
  } catch (error: any) {
    logMonitor('PRODUCT_ACTIVITIES', 'ERROR', { action: 'GET_PRODUCT_ACTIVITIES', error: error?.message || String(error) });
    console.error('Error fetching product activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}