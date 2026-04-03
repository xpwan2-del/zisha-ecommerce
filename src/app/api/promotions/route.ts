import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/promotions - Get all promotions
export async function GET() {
  try {
    const result = await query(`
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.discount, 
        p.start_date, 
        p.end_date, 
        p.active, 
        p.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pr.id,
              'name', pr.name,
              'price', pr.price,
              'images', pr.images
            )
          ) FILTER (WHERE pr.id IS NOT NULL), '[]'
        ) as products
      FROM promotions p
      LEFT JOIN promotion_products pp ON p.id = pp.promotion_id
      LEFT JOIN products pr ON pp.product_id = pr.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error getting promotions:', error);
    return NextResponse.json({ error: 'Failed to get promotions' }, { status: 500 });
  }
}

// POST /api/promotions - Create new promotion
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, description, discount, start_date, end_date, active, products = [] } = data;
    
    // Start transaction
    await query('BEGIN');
    
    // Create promotion
    const promotionResult = await query(
      'INSERT INTO promotions (name, description, discount, start_date, end_date, active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, description, discount, start_date, end_date, active]
    );
    
    const promotionId = promotionResult.rows[0].id;
    
    // Add products to promotion
    if (products.length > 0) {
      for (const productId of products) {
        await query(
          'INSERT INTO promotion_products (promotion_id, product_id) VALUES ($1, $2)',
          [promotionId, productId]
        );
      }
    }
    
    // Commit transaction
    await query('COMMIT');
    
    // Return the created promotion with products
    const finalResult = await query(`
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.discount, 
        p.start_date, 
        p.end_date, 
        p.active, 
        p.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pr.id,
              'name', pr.name,
              'price', pr.price,
              'images', pr.images
            )
          ) FILTER (WHERE pr.id IS NOT NULL), '[]'
        ) as products
      FROM promotions p
      LEFT JOIN promotion_products pp ON p.id = pp.promotion_id
      LEFT JOIN products pr ON pp.product_id = pr.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [promotionId]);
    
    return NextResponse.json(finalResult.rows[0]);
  } catch (error) {
    // Rollback transaction on error
    await query('ROLLBACK');
    console.error('Error creating promotion:', error);
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 });
  }
}

// PUT /api/promotions - Update promotion
export async function PUT(request: NextRequest) {
  try {
    const { id, name, description, discount, start_date, end_date, active, products = [] } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Promotion ID is required' }, { status: 400 });
    }
    
    // Start transaction
    await query('BEGIN');
    
    // Update promotion
    const updateResult = await query(
      'UPDATE promotions SET name = $1, description = $2, discount = $3, start_date = $4, end_date = $5, active = $6 WHERE id = $7 RETURNING id',
      [name, description, discount, start_date, end_date, active, id]
    );
    
    if (updateResult.rowCount === 0) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }
    
    // Delete existing product associations
    await query('DELETE FROM promotion_products WHERE promotion_id = $1', [id]);
    
    // Add new product associations
    if (products.length > 0) {
      for (const productId of products) {
        await query(
          'INSERT INTO promotion_products (promotion_id, product_id) VALUES ($1, $2)',
          [id, productId]
        );
      }
    }
    
    // Commit transaction
    await query('COMMIT');
    
    // Return the updated promotion with products
    const finalResult = await query(`
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.discount, 
        p.start_date, 
        p.end_date, 
        p.active, 
        p.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pr.id,
              'name', pr.name,
              'price', pr.price,
              'images', pr.images
            )
          ) FILTER (WHERE pr.id IS NOT NULL), '[]'
        ) as products
      FROM promotions p
      LEFT JOIN promotion_products pp ON p.id = pp.promotion_id
      LEFT JOIN products pr ON pp.product_id = pr.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [id]);
    
    return NextResponse.json(finalResult.rows[0]);
  } catch (error) {
    // Rollback transaction on error
    await query('ROLLBACK');
    console.error('Error updating promotion:', error);
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 });
  }
}

// DELETE /api/promotions - Delete promotion
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Promotion ID is required' }, { status: 400 });
    }
    
    // Start transaction
    await query('BEGIN');
    
    // Delete product associations
    await query('DELETE FROM promotion_products WHERE promotion_id = $1', [id]);
    
    // Delete promotion
    const deleteResult = await query('DELETE FROM promotions WHERE id = $1', [id]);
    
    if (deleteResult.rowCount === 0) {
      await query('ROLLBACK');
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }
    
    // Commit transaction
    await query('COMMIT');
    
    return NextResponse.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    // Rollback transaction on error
    await query('ROLLBACK');
    console.error('Error deleting promotion:', error);
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 });
  }
}
