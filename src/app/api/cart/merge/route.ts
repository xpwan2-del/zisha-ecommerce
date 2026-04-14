import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 验证登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const data = await request.json();
    const { guest_cart } = data;

    if (!guest_cart || !Array.isArray(guest_cart)) {
      return NextResponse.json(
        { success: false, error: 'Invalid guest cart data' },
        { status: 400 }
      );
    }

    const user_id = authResult.user?.id;

    // 合并购物车
    for (const item of guest_cart) {
      const { product_id, quantity } = item;

      // 检查商品是否存在
      const productResult = await query('SELECT id, stock FROM products WHERE id = ?', [product_id]);
      if (productResult.rows.length === 0) {
        continue; // 跳过不存在的商品
      }

      const product = productResult.rows[0];
      if (product.stock < quantity) {
        continue; // 跳过库存不足的商品
      }

      // 检查商品是否已在购物车中
      const existingItem = await query(
        'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
        [user_id, product_id]
      );

      if (existingItem.rows.length > 0) {
        // 更新数量
        const newQuantity = existingItem.rows[0].quantity + quantity;
        if (newQuantity <= product.stock) {
          await query(
            'UPDATE cart_items SET quantity = ? WHERE id = ?',
            [newQuantity, existingItem.rows[0].id]
          );
        }
      } else {
        // 添加新商品
        await query(
          'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
          [user_id, product_id, quantity]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cart merged successfully'
    });
  } catch (error) {
    console.error('Error merging cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to merge cart' },
      { status: 500 }
    );
  }
}
