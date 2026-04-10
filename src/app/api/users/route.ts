import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireAdmin, requireOwnerOrAdmin } from '@/lib/auth';

// GET /api/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const adminResult = requireAdmin(request);
    if (adminResult.response) {
      return adminResult.response;
    }

    const result = await query('SELECT id, name, email, phone, role, level, points, total_spent, referral_code, created_at FROM users ORDER BY created_at DESC');
    
    return NextResponse.json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (public)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, email, phone, password, referral_code, referred_by } = data;
    
    // Check if user already exists
    const existingUser = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    const result = await query(
      'INSERT INTO users (name, email, phone, password, referral_code, referred_by, level, points, total_spent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, name, email, phone, role, level, points, total_spent, referral_code, created_at',
      [name, email, phone, password, referral_code, referred_by, 'regular', 0, 0]
    );
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT /api/users - Update user (only own profile or admin)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    
    // 验证登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }
    
    // 验证权限（只能修改自己的信息，或管理员可以修改任何）
    const permissionResult = requireOwnerOrAdmin(request, id);
    if (permissionResult.response) {
      return permissionResult.response;
    }
    
    // Build update query
    const fields = Object.keys(data).map((key, index) => `${key} = ?`);
    const values = Object.values(data);
    
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ? RETURNING id, name, email, phone, role, level, points, total_spent, referral_code, created_at`,
      [...values, id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users - Delete user (only own account or admin)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // 验证登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }
    
    // 验证权限（只能删除自己的账户，或管理员可以删除任何）
    const permissionResult = requireOwnerOrAdmin(request, parseInt(id));
    if (permissionResult.response) {
      return permissionResult.response;
    }
    
    const result = await query('DELETE FROM users WHERE id = ? RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: { message: 'User deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
