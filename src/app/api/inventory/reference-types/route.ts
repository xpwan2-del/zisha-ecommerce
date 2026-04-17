import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const typesQuery = `
      SELECT
        id,
        code,
        name,
        name_en,
        description,
        created_at
      FROM reference_types
      ORDER BY id ASC
    `;

    const result = await query(typesQuery);
    const types = result.rows || [];

    return NextResponse.json({
      success: true,
      data: types.map((t: any) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        name_en: t.name_en,
        description: t.description,
        created_at: t.created_at
      }))
    });

  } catch (error) {
    console.error('Error fetching reference types:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reference types' },
      { status: 500 }
    );
  }
}
