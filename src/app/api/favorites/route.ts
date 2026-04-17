import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }
    
    const user_id = authResult.user?.userId;
    
    if (productId) {
      const result = await query(
        'SELECT id FROM user_favorites WHERE user_id = ? AND product_id = ?',
        [user_id, productId]
      );
      
      return NextResponse.json({
        success: true,
        data: { isFavorited: result.rows.length > 0, favoriteId: result.rows[0]?.id }
      });
    }
    
    const result = await query(
      `SELECT uf.id, uf.product_id, uf.created_at, p.name, p.name_en, p.name_ar, p.price, p.image
       FROM user_favorites uf
       LEFT JOIN products p ON uf.product_id = p.id
       WHERE uf.user_id = ?
       ORDER BY uf.created_at DESC`,
      [user_id]
    );
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }
    
    const user_id = authResult.user?.userId;
    const { product_id } = await request.json();
    
    if (!product_id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    const existingResult = await query(
      'SELECT id FROM user_favorites WHERE user_id = ? AND product_id = ?',
      [user_id, product_id]
    );
    
    if (existingResult.rows.length > 0) {
      return NextResponse.json({
        success: true,
        data: { message: 'Already favorited', favoriteId: existingResult.rows[0].id }
      });
    }
    
    const productResult = await query('SELECT id FROM products WHERE id = ?', [product_id]);
    if (productResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    const result = await query(
      'INSERT INTO user_favorites (user_id, product_id) VALUES (?, ?) RETURNING id',
      [user_id, product_id]
    );
    
    return NextResponse.json({
      success: true,
      data: { favoriteId: result.rows[0].id }
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }
    
    const user_id = authResult.user?.userId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const productId = searchParams.get('product_id');
    
    if (!id && !productId) {
      return NextResponse.json(
        { success: false, error: 'Favorite ID or Product ID is required' },
        { status: 400 }
      );
    }
    
    let result;
    if (id) {
      result = await query(
        'DELETE FROM user_favorites WHERE id = ? AND user_id = ? RETURNING id',
        [id, user_id]
      );
    } else {
      result = await query(
        'DELETE FROM user_favorites WHERE product_id = ? AND user_id = ? RETURNING id',
        [productId, user_id]
      );
    }
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Favorite not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: { message: 'Favorite removed' }
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}