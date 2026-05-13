import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

function createErrorResponse(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request: NextRequest) {
  logMonitor('ADMIN_AUTH', 'REQUEST', {
    method: 'POST',
    path: '/api/admin/login'
  });

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const result = await query('SELECT * FROM users WHERE email = ?', [email]);

    if (result.rows.length === 0) {
      logMonitor('ADMIN_AUTH', 'AUTH_FAILED', { reason: 'User not found' });
      return createErrorResponse('INVALID_CREDENTIALS', 401);
    }

    const user = result.rows[0];

    if (user.role !== 'admin') {
      logMonitor('ADMIN_AUTH', 'AUTH_FAILED', { reason: 'Not admin', userId: user.id });
      return createErrorResponse('ADMIN_REQUIRED', 403);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      logMonitor('ADMIN_AUTH', 'AUTH_FAILED', { reason: 'Invalid password', userId: user.id });
      return createErrorResponse('INVALID_CREDENTIALS', 401);
    }

    const accessToken = jwt.sign(
      { userId: user.id, id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '2h' }
    );

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 2,
      path: '/'
    });

    logMonitor('ADMIN_AUTH', 'SUCCESS', { action: 'ADMIN_LOGIN_SUCCESS', userId: user.id });

    return response;
  } catch (error) {
    logMonitor('ADMIN_AUTH', 'ERROR', { action: 'ADMIN_LOGIN', error: String(error) });
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
