import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 验证登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const user_id = authResult.user?.id;

    // Get user profile
    const result = await query(
      `SELECT
        id, name, email, phone, role, level, points, total_spent,
        referral_code, referred_by, created_at, updated_at
      FROM users
      WHERE id = ?`,
      [user_id]
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
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 验证登录
    const authResult = requireAuth(request);
    if (authResult.response) {
      return authResult.response;
    }

    const user_id = authResult.user?.id;
    const data = await request.json();

    // Exclude sensitive fields
    const { password, ...updateData } = data;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Build update query
    const fields = Object.keys(updateData).map((key, index) => `${key} = ?`);
    const values = Object.values(updateData);

    // Start transaction
    await query('BEGIN TRANSACTION');

    try {
      // Update user
      const result = await query(
        `UPDATE users SET ${fields.join(', ')}, updated_at = datetime("now") WHERE id = ? RETURNING id, name, email, phone, role, level, points, total_spent, referral_code, referred_by, created_at, updated_at`,
        [...values, user_id]
      );

      if (result.rows.length === 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      // Record user logs
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

      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
