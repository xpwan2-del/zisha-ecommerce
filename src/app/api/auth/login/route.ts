import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logInfo, logError, logDebug } from '@/lib/utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-key';

export async function POST(request: NextRequest) {
  const requestId = Date.now();
  logInfo('[SERVER: /api/auth/login] Request received', { requestId, timestamp: new Date().toISOString() });
  
  try {
    const body = await request.json();
    const { email, password } = body;
    
    logDebug('Login attempt', { requestId, email });
    
    // 查找用户
    logDebug('Looking up user in database', { requestId, email });
    const result = await query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (result.rows.length === 0) {
      logError('User not found', { requestId, email });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    const user = result.rows[0];
    logInfo('User found', { requestId, userId: user.id, email, name: user.name, role: user.role });
    
    // 验证密码
    logDebug('Verifying password', { requestId, userId: user.id });
    const isValidPassword = await bcrypt.compare(password, user.password as string);
    
    if (!isValidPassword) {
      logError('Invalid password', { requestId, userId: user.id, email });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    logInfo('Password verified successfully', { requestId, userId: user.id });
    
    // 生成 access token (48 hours)
    logDebug('Generating access token', { requestId, userId: user.id, expiresIn: '48h' });
    const accessToken = jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '48h' }
    );
    
    // 生成 refresh token (7 days)
    logDebug('Generating refresh token', { requestId, userId: user.id, expiresIn: '7d' });
    const refreshToken = jwt.sign(
      {
        user_id: user.id,
        email: user.email
      },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );
    
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      level: user.level,
      points: user.points,
      total_spent: user.total_spent,
      referral_code: user.referral_code,
      created_at: user.created_at
    };
    
    logInfo('[SERVER: /api/auth/login] Success', { 
      requestId, 
      userId: user.id, 
      email, 
      loginStatus: 'LOGGED_IN',
      tokensGenerated: true 
    });
    
    return NextResponse.json({
      user: userResponse,
      access_token: accessToken,
      refresh_token: refreshToken,
      message: 'Login successful'
    });
  } catch (error) {
    logError('[SERVER: /api/auth/login] Error', { requestId, error: String(error) });
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}