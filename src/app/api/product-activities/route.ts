import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/product-activities?product_id=1 - Get activities for a product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    const result = await query(`
      SELECT 
        ac.id, 
        ac.name, 
        ac.name_en, 
        ac.name_ar, 
        ac.icon, 
        ac.color, 
        ac.status
      FROM activity_categories ac
      JOIN product_activities pa ON ac.id = pa.activity_category_id
      WHERE pa.product_id = ?
      AND ac.status = 'active'
    `, [productId]);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error getting product activities:', error);
    return NextResponse.json({ error: 'Failed to get product activities' }, { status: 500 });
  }
}

// POST /api/product-activities - Add activity to product
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { product_id, activity_category_id } = data;
    
    if (!product_id || !activity_category_id) {
      return NextResponse.json({ error: 'Product ID and activity category ID are required' }, { status: 400 });
    }
    
    const existing = await query(
      'SELECT id FROM product_activities WHERE product_id = ? AND activity_category_id = ?',
      [product_id, activity_category_id]
    );
    
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Activity already added to product' }, { status: 400 });
    }
    
    const result = await query(
      'INSERT INTO product_activities (product_id, activity_category_id) VALUES (?, ?)',
      [product_id, activity_category_id]
    );
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding activity to product:', error);
    return NextResponse.json({ error: 'Failed to add activity to product' }, { status: 500 });
  }
}

// DELETE /api/product-activities - Remove activity from product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const activityCategoryId = searchParams.get('activity_category_id');
    
    if (!productId || !activityCategoryId) {
      return NextResponse.json({ error: 'Product ID and activity category ID are required' }, { status: 400 });
    }
    
    const deleteResult = await query(
      'DELETE FROM product_activities WHERE product_id = ? AND activity_category_id = ?',
      [productId, activityCategoryId]
    );
    
    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ error: 'Activity not found for this product' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Activity removed from product successfully' });
  } catch (error) {
    console.error('Error removing activity from product:', error);
    return NextResponse.json({ error: 'Failed to remove activity from product' }, { status: 500 });
  }
}