import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {GET} /api/products/init 初始化产品表结构
 * @apiName InitProductsTable
 * @apiGroup PRODUCTS
 * @apiDescription 创建或更新 products、product_prices 等产品相关表。
 */


export async function POST(request: NextRequest) {
  try {
    logMonitor('PRODUCTS', 'REQUEST', { method: 'POST', action: 'INIT_PRODUCTS' });

    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        name_ar VARCHAR(255),
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

    await query(`
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)
    `);

    logMonitor('PRODUCTS', 'SUCCESS', { action: 'INIT_PRODUCTS' });
    return NextResponse.json({ message: 'Products table initialized successfully' });
  } catch (error: any) {
    logMonitor('PRODUCTS', 'ERROR', { action: 'INIT_PRODUCTS', error: error?.message || String(error) });
    console.error('Error initializing products table:', error);
    return NextResponse.json({ error: 'Failed to initialize products table' }, { status: 500 });
  }
}