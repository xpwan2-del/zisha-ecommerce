import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/users - Get all users
export async function GET() {
  try {
    const result = await query('SELECT id, name, email, phone, role, level, points, total_spent, referral_code, created_at FROM users ORDER BY created_at DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json({ error: 'Failed to get users' }, { status: 500 });
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, email, phone, password, referral_code, referred_by } = data;
    
    // Check if user already exists
    const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }
    
    const result = await query(
      'INSERT INTO users (name, email, phone, password, referral_code, referred_by, level, points, total_spent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name, email, phone, role, level, points, total_spent, referral_code, created_at',
      [name, email, phone, password, referral_code, referred_by, 'regular', 0, 0]
    );
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PUT /api/users - Update user
export async function PUT(request: NextRequest) {
  try {
    const { id, ...data } = await request.json();
    
    // Build update query
    const fields = Object.keys(data).map((key, index) => `${key} = $${index + 2}`);
    const values = Object.values(data);
    
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $1 RETURNING id, name, email, phone, role, level, points, total_spent, referral_code, created_at`,
      [id, ...values]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/users - Delete user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
