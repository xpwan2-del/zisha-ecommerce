import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const result = await query('SELECT * FROM teapot_types WHERE status = ? ORDER BY name', ['active']);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching teapot types:', error);
    return NextResponse.json({ error: 'Failed to fetch teapot types' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, name_en, name_ar, images, min_capacity, max_capacity, base_price, description } = body;
    
    const result = await query(
      `INSERT INTO teapot_types (name, name_en, name_ar, images, min_capacity, max_capacity, base_price, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
      [name, name_en, name_ar, images || [], min_capacity, max_capacity, base_price, description]
    );
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating teapot type:', error);
    return NextResponse.json({ error: 'Failed to create teapot type' }, { status: 500 });
  }
}