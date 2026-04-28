import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireAdmin, requireOwnerOrAdmin } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 用户管理
 * ============================================================
 *
 * @api {GET} /api/users 获取用户列表
 * @apiName GetUsers
 * @apiGroup PRODUCTS
 * @apiDescription 获取所有用户列表（仅管理员）
 *
 * @api {POST} /api/users 创建新用户
 * @apiName CreateUser
 * @apiGroup PRODUCTS
 * @apiDescription 注册新用户
 *
 * @api {PUT} /api/users 更新用户
 * @apiName UpdateUser
 * @apiGroup PRODUCTS
 * @apiDescription 更新用户信息（仅本人或管理员）
 *
 * @api {DELETE} /api/users 删除用户
 * @apiName DeleteUser
 * @apiGroup PRODUCTS
 * @apiDescription 删除用户账户（仅本人或管理员）
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 * @apiHeader {String} Authorization Bearer Token 用户认证凭证
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} UNAUTHORIZED 未登录或Token无效
 * @apiError {String} FORBIDDEN 需要管理员权限
 * @apiError {String} NOT_FOUND 用户不存在
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

// GET /api/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'GET',
    path: '/api/users'
  });

  try {
    const adminResult = requireAdmin(request);
    if (adminResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Admin required' });
      return adminResult.response;
    }

    logMonitor('PRODUCTS', 'INFO', {
      action: 'GET_ALL_USERS'
    });

    const result = await query('SELECT id, name, email, phone, role, level, points, total_spent, referral_code, created_at FROM users ORDER BY created_at DESC');

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'GET_ALL_USERS',
      count: result.rows.length
    });

    return NextResponse.json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('Error getting users:', error);
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'GET_ALL_USERS',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to get users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (public)
export async function POST(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'POST',
    path: '/api/users'
  });

  try {
    const data = await request.json();
    const { name, email, phone, password, referral_code, referred_by } = data;

    if (!name || !email || !password) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'Missing required fields',
        required: ['name', 'email', 'password']
      });
      return NextResponse.json(
        { success: false, error: 'Name, email and password are required' },
        { status: 400 }
      );
    }

    logMonitor('PRODUCTS', 'INFO', {
      action: 'CREATE_USER',
      emailPrefix: email.substring(0, 3)
    });

    const existingUser = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.rows.length > 0) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'User already exists',
        emailPrefix: email.substring(0, 3)
      });
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const insertResult = await query(
      'INSERT INTO users (name, email, phone, password, referral_code, referred_by, level, points, total_spent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, password, referral_code, referred_by, 'regular', 0, 0]
    );

    const newUser = await query(
      'SELECT id, name, email, phone, role, level, points, total_spent, referral_code, created_at FROM users WHERE id = ?',
      [insertResult.lastInsertRowid]
    );

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'CREATE_USER',
      userId: insertResult.lastInsertRowid
    });

    return NextResponse.json({
      success: true,
      data: newUser.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'CREATE_USER',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT /api/users - Update user (only own profile or admin)
export async function PUT(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'PUT',
    path: '/api/users'
  });

  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'Missing required field: id'
      });
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const permissionResult = requireOwnerOrAdmin(request, id);
    if (permissionResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Permission denied' });
      return permissionResult.response;
    }

    logMonitor('PRODUCTS', 'INFO', {
      action: 'UPDATE_USER',
      userId: id,
      updatedBy: authResult.user?.userId
    });

    const fields = Object.keys(data).map((key, index) => `${key} = ?`);
    const values = Object.values(data);

    const updateResult = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      [...values, id]
    );

    if (!updateResult.changes || updateResult.changes === 0) {
      logMonitor('PRODUCTS', 'NOT_FOUND', {
        reason: 'User not found',
        userId: id
      });
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const updatedUser = await query(
      'SELECT id, name, email, phone, role, level, points, total_spent, referral_code, created_at FROM users WHERE id = ?',
      [id]
    );

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'UPDATE_USER',
      userId: id
    });

    return NextResponse.json({
      success: true,
      data: updatedUser.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'UPDATE_USER',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users - Delete user (only own account or admin)
export async function DELETE(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'DELETE',
    path: '/api/users'
  });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'Missing required field: id'
      });
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const permissionResult = requireOwnerOrAdmin(request, parseInt(id));
    if (permissionResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Permission denied' });
      return permissionResult.response;
    }

    logMonitor('PRODUCTS', 'INFO', {
      action: 'DELETE_USER',
      userId: id,
      deletedBy: authResult.user?.userId
    });

    const deleteResult = await query('DELETE FROM users WHERE id = ?', [id]);

    if (!deleteResult.changes || deleteResult.changes === 0) {
      logMonitor('PRODUCTS', 'NOT_FOUND', {
        reason: 'User not found',
        userId: id
      });
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'DELETE_USER',
      userId: id
    });

    return NextResponse.json({
      success: true,
      data: { message: 'User deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'DELETE_USER',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
