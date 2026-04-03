import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, password, referral_code } = body;
    
    // 检查邮箱是否已存在
    const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
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
      const referrer = await query('SELECT id FROM users WHERE referral_code = $1', [referral_code]);
      if (referrer.rows.length > 0) {
        referrerId = referrer.rows[0].id;
      }
    }
    
    // 创建用户
    const result = await query(
      `INSERT INTO users (name, email, phone, password, referral_code, referred_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, role, level, points, total_spent, referral_code, created_at`,
      [name, email, phone, hashedPassword, generatedReferralCode, referrerId]
    );
    
    const user = result.rows[0];
    
    // 如果有推荐人，创建推荐记录
    if (referrerId) {
      await query(
        `INSERT INTO recommendations (referrer_id, referee_id, status, reward_points, reward_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [referrerId, user.id, 'pending', 100, 50]
      );
    }
    
    return NextResponse.json({ user, message: 'Registration successful' }, { status: 201 });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}