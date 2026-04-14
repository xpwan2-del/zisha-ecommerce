import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-key';

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
    const result = await query(
      `INSERT INTO users (name, email, phone, password, referral_code, referred_by)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING id, name, email, phone, role, level, points, total_spent, referral_code, created_at`,
      [name, email, phone, hashedPassword, generatedReferralCode, referrerId]
    );

    const user = result.rows[0];

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
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 生成 refresh token (30 days) - 统一使用 userId 字段
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '30d' }
    );
    
    return NextResponse.json({
      user,
      access_token: accessToken,
      refresh_token: refreshToken,
      message: 'Registration successful'
    }, { status: 201 });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}