import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';

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
    
    return NextResponse.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create a new review
export async function POST(request: NextRequest) {
  try {
    // 验证登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const data = await request.json();
    const { product_id, rating, comment, comment_en, comment_ar, images } = data;
    
    // 从JWT中获取user_id
    const user_id = authResult.user?.id;
    
    const result = await query(
      'INSERT INTO reviews (product_id, user_id, rating, comment, comment_en, comment_ar, images) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *',
      [product_id, user_id, rating, comment, comment_en, comment_ar, JSON.stringify(images || [])]
    );
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews - Delete all reviews (admin only)
export async function DELETE() {
  try {
    // 验证管理员权限
    const adminResult = requireAdmin(new NextRequest('http://localhost'));
    if (adminResult.response) {
      return adminResult.response;
    }

    await query('DELETE FROM reviews');
    return NextResponse.json({
      success: true,
      data: { message: 'All reviews deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete reviews' },
      { status: 500 }
    );
  }
}
