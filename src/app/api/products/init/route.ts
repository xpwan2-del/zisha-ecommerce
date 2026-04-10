import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 创建产品表
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        name_ar VARCHAR(255),
        price DECIMAL(10, 2) NOT NULL,
        original_price DECIMAL(10, 2),
        stock INTEGER DEFAULT 0,
        category_id VARCHAR(50),
        image TEXT,
        images TEXT,
        video TEXT,
        description TEXT,
        features TEXT,
        specifications TEXT,
        shipping TEXT,
        after_sale TEXT,
        is_limited INTEGER DEFAULT 0,
        discount INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    await query(`
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_products_price ON products(price)
    `);

    return NextResponse.json({ message: 'Products table initialized successfully' });
  } catch (error) {
    console.error('Error initializing products table:', error);
    return NextResponse.json({ error: 'Failed to initialize products table' }, { status: 500 });
  }
}