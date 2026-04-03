import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/activity-categories - Get all activity categories
export async function GET() {
  try {
    const result = await query(`
      SELECT id, name, name_en, name_ar, icon, color, status, created_at, updated_at
      FROM activity_categories
      ORDER BY created_at DESC
    `);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error getting activity categories:', error);
    return NextResponse.json({ error: 'Failed to get activity categories' }, { status: 500 });
  }
}

// POST /api/activity-categories - Create new activity category
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, name_en, name_ar, icon, color, status = 'active' } = data;
    
    const result = await query(
      'INSERT INTO activity_categories (name, name_en, name_ar, icon, color, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, name_en, name_ar, icon, color, status]
    );
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating activity category:', error);
    return NextResponse.json({ error: 'Failed to create activity category' }, { status: 500 });
  }
}

// PUT /api/activity-categories - Update activity category
export async function PUT(request: NextRequest) {
  try {
    const { id, name, name_en, name_ar, icon, color, status } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Activity category ID is required' }, { status: 400 });
    }
    
    const updateResult = await query(
      'UPDATE activity_categories SET name = ?, name_en = ?, name_ar = ?, icon = ?, color = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, name_en, name_ar, icon, color, status, id]
    );
    
    if (updateResult.rowCount === 0) {
      return NextResponse.json({ error: 'Activity category not found' }, { status: 404 });
    }
    
    return NextResponse.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Error updating activity category:', error);
    return NextResponse.json({ error: 'Failed to update activity category' }, { status: 500 });
  }
}

// DELETE /api/activity-categories - Delete activity category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Activity category ID is required' }, { status: 400 });
    }
    
    await query('DELETE FROM product_activities WHERE activity_category_id = ?', [id]);
    
    const deleteResult = await query('DELETE FROM activity_categories WHERE id = ?', [id]);
    
    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ error: 'Activity category not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Activity category deleted successfully' });
  } catch (error) {
    console.error('Error deleting activity category:', error);
    return NextResponse.json({ error: 'Failed to delete activity category' }, { status: 500 });
  }
}