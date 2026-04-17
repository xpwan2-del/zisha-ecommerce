import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get('direction');

    let whereClause = '';
    const params: any[] = [];

    if (direction) {
      whereClause = 'WHERE direction = ?';
      params.push(direction);
    }

    const typesQuery = `
      SELECT
        id,
        code,
        name,
        name_en,
        direction,
        description,
        created_at
      FROM transaction_types
      ${whereClause}
      ORDER BY id ASC
    `;

    const result = await query(typesQuery, params);
    const types = result.rows || [];

    return NextResponse.json({
      success: true,
      data: types.map((t: any) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        name_en: t.name_en,
        direction: t.direction,
        description: t.description,
        created_at: t.created_at
      }))
    });

  } catch (error) {
    console.error('Error fetching transaction types:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transaction types' },
      { status: 500 }
    );
  }
}
