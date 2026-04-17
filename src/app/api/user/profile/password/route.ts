import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(request: NextRequest) {
  try {
    // 验证登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const user_id = authResult.user?.userId;
    const data = await request.json();
    const { current_password, new_password } = data;

    if (!current_password || !new_password) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Start transaction
    await query('BEGIN TRANSACTION');

    try {
      // Check current password
      const userResult = await query('SELECT password FROM users WHERE id = ?', [user_id]);
      if (userResult.rows.length === 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      const currentHash = userResult.rows[0].password;
      const isMatch = await bcrypt.compare(current_password, currentHash);
      
      if (!isMatch) {
        await query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(new_password, salt);

      // Update password
      await query(
        'UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?',
        [newHash, user_id]
      );

      // Record user log
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
    return NextResponse.json(
      { success: false, error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
