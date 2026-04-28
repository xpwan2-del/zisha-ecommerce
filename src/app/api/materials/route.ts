import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const result = await query('SELECT * FROM materials ORDER BY name');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching materials:', error);
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, name_en, name_ar, color, description, price_modifier, stock } = body;
    
    const insertResult = await query(
      `INSERT INTO materials (name, name_en, name_ar, color, description, price_modifier, stock)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, name_en, name_ar, color, description, price_modifier || 0, stock]
    );

    const newMaterial = await query('SELECT * FROM materials WHERE id = ?', [insertResult.lastInsertRowid]);

    return NextResponse.json(newMaterial.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating material:', error);
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
  }
}