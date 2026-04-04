import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');

    let whereClause = 'WHERE 1=1';
    let params: any[] = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as count FROM lucky_draws ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(String(countResult.rows[0].count)) || 0;

    const luckyDrawsQuery = `
      SELECT 
        ld.*,
        p.name as product_name,
        p.image as product_image,
        p.price as product_price
      FROM lucky_draws ld
      LEFT JOIN products p ON ld.product_id = p.id
      ${whereClause}
      ORDER BY ld.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const luckyDrawsResult = await query(luckyDrawsQuery, params);
    const luckyDraws = luckyDrawsResult.rows;

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      luckyDraws,
      total,
      page,
      totalPages
    });
  } catch (error) {
    console.error('Error fetching lucky draws:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
