import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { logMonitor } from '@/lib/utils/logger';

/**
 * ============================================================
 * 密码修改管理
 * ============================================================
 *
 * @api {PUT} /api/user/profile/password 修改密码
 * @apiName ChangePassword
 * @apiGroup PRODUCTS
 * @apiDescription 修改当前登录用户的密码
 *
 * @apiHeader {String} [x-lang] 语言设置 (zh|en|ar)
 * @apiHeader {String} Authorization Bearer Token 用户认证凭证
 *
 * @apiParam {String} current_password 当前密码
 * @apiParam {String} new_password 新密码（至少6位）
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 返回数据
 *
 * @apiError {String} UNAUTHORIZED 未登录或Token无效
 * @apiError {String} INVALID_PASSWORD 当前密码错误
 * @apiError {String} VALIDATION_FAILED 参数验证失败
 * @apiError {String} INTERNAL_ERROR 服务器内部错误
 */

export async function PUT(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'Put',
    path: '/api/user/profile/password'
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', { reason: 'Unauthorized' });
      return authResult.response;
    }

    const user_id = authResult.user?.userId;
    const data = await request.json();
    const { current_password, new_password } = data;

    if (!current_password || !new_password) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'Missing required fields',
        required: ['current_password', 'new_password']
      });
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'Password too short',
        minLength: 6,
        actualLength: new_password.length
      });
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    logMonitor('PRODUCTS', 'INFO', {
      action: 'CHANGE_PASSWORD',
      userId: user_id
    });

    await query('BEGIN TRANSACTION');

    try {
      const userResult = await query('SELECT password FROM users WHERE id = ?', [user_id]);
      if (userResult.rows.length === 0) {
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

      const currentHash = userResult.rows[0].password;
      const isMatch = await bcrypt.compare(current_password, currentHash);

      if (!isMatch) {
        await query('ROLLBACK');
        logMonitor('PRODUCTS', 'AUTH_FAILED', {
          reason: 'Invalid current password',
          userId: user_id
        });
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(new_password, salt);

      await query(
        'UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?',
        [newHash, user_id]
      );

      await query(
        `INSERT INTO user_logs (
          user_id, action_type, target_table, target_id,
          field_name, old_value, new_value, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          'password_change',
          'users',
          user_id,
          'password',
          '******',
          '******',
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
          request.headers.get('user-agent') || ''
        ]
      );

      await query('COMMIT');

      logMonitor('PRODUCTS', 'SUCCESS', {
        action: 'CHANGE_PASSWORD',
        userId: user_id
      });

      return NextResponse.json({
        success: true,
        data: { message: 'Password changed successfully' }
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error changing password:', error);
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'CHANGE_PASSWORD',
      error: String(error)
    });
    return NextResponse.json(
      { success: false, error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
