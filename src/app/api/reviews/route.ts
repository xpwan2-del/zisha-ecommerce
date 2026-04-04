import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/reviews - Get all reviews
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const lang = searchParams.get('lang') || 'zh';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    let sql = `
      SELECT
        r.id,
        r.rating,
        r.comment,
        r.comment_en,
        r.comment_ar,
        r.images,
        r.created_at,
        u.name as user_name,
        p.name as product_name,
        p.name_en as product_name_en,
        p.name_ar as product_name_ar,
        p.image as product_image,
        p.price as product_price
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
    `;
    
    const params: any[] = [];
    
    if (productId) {
      sql += ' WHERE r.product_id = ?';
      params.push(productId);
    }
    
    sql += ' ORDER BY r.created_at DESC LIMIT ?';
    params.push(limit);
    
    const result = await query(sql, params);
    
    const reviews = result.rows.map((review: any) => {
      let comment = review.comment;
      if (lang === 'en' && review.comment_en) {
        comment = review.comment_en;
      } else if (lang === 'ar' && review.comment_ar) {
        comment = review.comment_ar;
      }

      return {
        ...review,
        rating: parseFloat(review.rating) || 0,
        comment,
        images: typeof review.images === 'string' ? JSON.parse(review.images) : review.images || [],
        product: review.product_name ? {
          id: review.product_id,
          name: lang === 'en' ? review.product_name_en : lang === 'ar' ? review.product_name_ar : review.product_name,
          image: review.product_image,
          price: parseFloat(review.product_price) || 0
        } : null
      };
    });
    
    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST /api/reviews - Create a new review
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { product_id, user_id, rating, comment, comment_en, comment_ar, images } = data;
    
    const result = await query(
      'INSERT INTO reviews (product_id, user_id, rating, comment, comment_en, comment_ar, images) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *',
      [product_id, user_id, rating, comment, comment_en, comment_ar, JSON.stringify(images || [])]
    );
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}

// DELETE /api/reviews - Delete all reviews
export async function DELETE() {
  try {
    await query('DELETE FROM reviews');
    return NextResponse.json({ message: 'All reviews deleted successfully' });
  } catch (error) {
    console.error('Error deleting reviews:', error);
    return NextResponse.json({ 
      error: 'Failed to delete reviews', 
      details: error 
    }, { status: 500 });
  }
}
