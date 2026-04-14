import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/cart - Get cart items
export async function GET(request: NextRequest) {
  try {
    // 验证登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const user_id = authResult.user?.id;

    // Get cart items with product details
    const result = await query(
      `SELECT
        c.id,
        c.product_id,
        c.quantity,
        c.created_at,
        p.name,
        p.name_en,
        p.name_ar,
        p.price,
        p.image,
        p.stock
      FROM cart_items c
      LEFT JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC`,
      [user_id]
    );

    // Calculate total
    let total = 0;
    let total_items = 0;
    const items = result.rows.map((item: any) => {
      const item_total = parseFloat(item.price) * item.quantity;
      total += item_total;
      total_items += item.quantity;
      return {
        ...item,
        price: parseFloat(item.price),
        original_price: parseFloat(item.price),
        subtotal: item_total
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        total_items
      }
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    // 验证登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const data = await request.json();
    const { product_id, quantity = 1 } = data;

    if (!product_id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const user_id = authResult.user?.id;

    // Check if product exists
    const productResult = await query('SELECT id, stock FROM products WHERE id = ?', [product_id]);
    if (productResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = productResult.rows[0];
    if (product.stock < quantity) {
      return NextResponse.json(
        { success: false, error: 'Insufficient stock' },
        { status: 400 }
      );
    }

    // Check if item already in cart
    const existingItem = await query(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
      [user_id, product_id]
    );

    let result;
    if (existingItem.rows.length > 0) {
      // Update quantity
      const newQuantity = existingItem.rows[0].quantity + quantity;
      if (newQuantity > product.stock) {
        return NextResponse.json(
          { success: false, error: 'Insufficient stock' },
          { status: 400 }
        );
      }

      result = await query(
        'UPDATE cart_items SET quantity = ? WHERE id = ? RETURNING id, product_id, quantity',
        [newQuantity, existingItem.rows[0].id]
      );
    } else {
      // Add new item
      result = await query(
        'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?) RETURNING id, product_id, quantity',
        [user_id, product_id, quantity]
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0]
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add to cart' },
      { status: 500 }
    );
  }
}

// PUT /api/cart - Update cart item quantity
export async function PUT(request: NextRequest) {
  try {
    // 验证登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const data = await request.json();
    const { id, quantity } = data;

    if (!id || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Item ID and valid quantity are required' },
        { status: 400 }
      );
    }

    const user_id = authResult.user?.id;

    // Check if item exists and belongs to user
    const itemResult = await query(
      'SELECT product_id FROM cart_items WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (itemResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart item not found' },
        { status: 404 }
      );
    }

    const product_id = itemResult.rows[0].product_id;

    // Check stock
    const productResult = await query('SELECT stock FROM products WHERE id = ?', [product_id]);
    if (productResult.rows[0].stock < quantity) {
      return NextResponse.json(
        { success: false, error: 'Insufficient stock' },
        { status: 400 }
      );
    }

    const result = await query(
      'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ? RETURNING id, product_id, quantity',
      [quantity, id, user_id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update cart' },
      { status: 500 }
    );
  }
}

// DELETE /api/cart - Remove item from cart
export async function DELETE(request: NextRequest) {
  try {
    // 验证登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clear = searchParams.get('clear');

    const user_id = authResult.user?.id;

    if (clear === 'true') {
      // Clear entire cart
      await query('DELETE FROM cart_items WHERE user_id = ?', [user_id]);
      return NextResponse.json({
        success: true,
        data: { message: 'Cart cleared successfully' }
      });
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Remove specific item
    const result = await query(
      'DELETE FROM cart_items WHERE id = ? AND user_id = ? RETURNING id',
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Item removed from cart' }
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove from cart' },
      { status: 500 }
    );
  }
}
