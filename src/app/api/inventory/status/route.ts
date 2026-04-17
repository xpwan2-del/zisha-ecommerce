import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        { success: false, error: 'Missing ids parameter' },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid ids parameter' },
        { status: 400 }
      );
    }

    const placeholders = ids.map(() => '?').join(',');

    const result = await query(`
      SELECT
        i.product_id as id,
        COALESCE(i.quantity, 0) as stock,
        i.status_id as stock_status_id,
        ins.id as status_id,
        ins.name as status_name,
        ins.name_en as status_name_en,
        ins.name_ar as status_name_ar,
        ins.color as status_color,
        ins.color_name as status_color_name
      FROM inventory i
      LEFT JOIN inventory_status ins ON i.status_id = ins.id
      WHERE i.product_id IN (${placeholders})
    `, ids);

    const data = (result.rows || []).map(row => ({
      id: row.id,
      stock: parseInt(row.stock) || 0,
      stock_status_id: row.stock_status_id || 1,
      stock_status_info: row.status_id ? {
        id: row.status_id,
        name: row.status_name,
        name_en: row.status_name_en,
        name_ar: row.status_name_ar,
        color: row.status_color,
        color_name: row.status_color_name
      } : null
    }));

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching inventory status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}