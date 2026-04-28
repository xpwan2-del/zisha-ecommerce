import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 个人资料管理
 * ============================================================
 *
 * @api {GET} /api/user/profile 获取个人资料
 * @apiName GetProfile
 * @apiGroup PRODUCTS
 * @apiDescription 获取当前登录用户的个人资料
 *
 * @api {PUT} /api/user/profile 更新个人资料
 * @apiName UpdateProfile
 * @apiGroup PRODUCTS
 * @apiDescription 更新当前登录用户的个人资料
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 * @apiHeader {String} Authorization Bearer Token 用户认证凭证
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} UNAUTHORIZED 未登录或Token无效
 * @apiError {String} NOT_FOUND 用户不存在
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

export async function GET(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'GET',
    path: '/api/user/profile'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const user_id = authResult.user?.userId;
    logMonitor('PRODUCTS', 'INFO', {
      action: 'GET_PROFILE',
      userId: user_id
    });

    const result = await query(
      `SELECT
        id, name, email, phone, role, level, points, total_spent,
        referral_code, referred_by, created_at, updated_at
      FROM users
      WHERE id = ?`,
      [user_id]
    );

    if (result.rows.length === 0) {
      logMonitor('PRODUCTS', 'NOT_FOUND', {
        reason: 'User not found',
        userId: user_id
      });
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'GET_PROFILE',
      userId: user_id
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'GET_PROFILE',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'PUT',
    path: '/api/user/profile'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const user_id = authResult.user?.userId;
    const data = await request.json();

    const { password, ...updateData } = data;

    if (Object.keys(updateData).length === 0) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'No fields to update'
      });
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    logMonitor('PRODUCTS', 'INFO', {
      action: 'UPDATE_PROFILE',
      userId: user_id,
      fields: Object.keys(updateData)
    });

    const fields = Object.keys(updateData).map((key, index) => `${key} = ?`);
    const values = Object.values(updateData);

    await query('BEGIN TRANSACTION');

    try {
      const updateResult = await query(
        `UPDATE users SET ${fields.join(', ')}, updated_at = datetime("now") WHERE id = ?`,
        [...values, user_id]
      );

      if (!updateResult.changes || updateResult.changes === 0) {
        await query('ROLLBACK');
        logMonitor('PRODUCTS', 'NOT_FOUND', {
          reason: 'User not found',
          userId: user_id
        });
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      for (const [field, value] of Object.entries(updateData)) {
        const oldResult = await query(`SELECT ${field} FROM users WHERE id = ?`, [user_id]);
        const oldValue = oldResult.rows[0][field];

        if (oldValue !== value) {
          await query(
            `INSERT INTO user_logs (
              user_id, action_type, target_table, target_id,
              field_name, old_value, new_value, ip_address, user_agent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              user_id,
              'profile_update',
              'users',
              user_id,
              field,
              String(oldValue),
              String(value),
              request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
              request.headers.get('user-agent') || ''
            ]
          );
        }
      }

      await query('COMMIT');

      const updatedUser = await query(
        'SELECT id, name, email, phone, role, level, points, total_spent, referral_code, created_at, updated_at FROM users WHERE id = ?',
        [user_id]
      );

      logMonitor('PRODUCTS', 'SUCCESS', {
        action: 'UPDATE_PROFILE',
        userId: user_id
      });

      return NextResponse.json({
        success: true,
        data: updatedUser.rows[0]
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'UPDATE_PROFILE',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
