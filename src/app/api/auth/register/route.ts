import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { logMonitor } from '@/lib/utils/logger';
import { getMessage } from '@/lib/messages';
/**
 * @api {POST} /api/auth/register 用户注册
 * @apiName Register
 * @apiGroup AUTH
 * @apiDescription 新用户注册账号，包含邮箱验证和密码加密。
 */


const isProduction = process.env.NODE_ENV === 'production';

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge,
    path: '/',
  } as const;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

function getRefreshTokenSecret(): string {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error('REFRESH_TOKEN_SECRET environment variable is required');
  }
  return secret;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, password, referral_code } = body;
    
    // 检查邮箱是否已存在
    const existingUser = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    
    // 生成推荐码
    const generatedReferralCode = crypto.randomBytes(5).toString('hex').toUpperCase();
    
    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 检查推荐人
    let referrerId = null;
    if (referral_code) {
      const referrer = await query('SELECT id FROM users WHERE referral_code = ?', [referral_code]);
      if (referrer.rows.length > 0) {
        referrerId = referrer.rows[0].id;
      }
    }

    // 创建用户
    const insertResult = await query(
      `INSERT INTO users (name, email, phone, password, referral_code, referred_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, phone, hashedPassword, generatedReferralCode, referrerId]
    );

    const newUser = await query(
      'SELECT id, name, email, phone, role, level, points, total_spent, referral_code, created_at FROM users WHERE id = ?',
      [insertResult.lastInsertRowid]
    );

    const user = newUser.rows[0];

    // 如果有推荐人，创建推荐记录
    if (referrerId) {
      await query(
        `INSERT INTO recommendations (referrer_id, referee_id, status, reward_points, reward_amount)
         VALUES (?, ?, ?, ?, ?)`,
        [referrerId, user.id, 'pending', 100, 50]
      );
    }

    // 生成 access token (2 hours) - 统一使用 userId 字段
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      getJwtSecret(),
      { expiresIn: '2h' }
    );

    // 生成 refresh token (30 days) - 统一使用 userId 字段
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      getRefreshTokenSecret(),
      { expiresIn: '30d' }
    );
    
    const response = NextResponse.json({
      user,
      message: 'Registration successful'
    }, { status: 201 });

    response.cookies.set('access_token', accessToken, cookieOptions(60 * 60 * 2));

    response.cookies.set('refresh_token', refreshToken, cookieOptions(60 * 60 * 24 * 30));

    return response;
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}