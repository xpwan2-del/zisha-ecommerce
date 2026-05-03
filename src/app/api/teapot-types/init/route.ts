import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {GET} /api/teapot-types/init 初始化壶型表
 * @apiName InitTeapotTypesTable
 * @apiGroup TEAPOT_TYPES
 * @apiDescription 创建壶型相关的数据库表结构。
 */


export async function POST(request: NextRequest) {
  try {
    logMonitor('TEAPOT_TYPES', 'REQUEST', { method: 'POST', action: 'INIT_TEAPOT_TYPES' });
    await query(`
      CREATE TABLE IF NOT EXISTS teapot_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        name_en VARCHAR(100) NOT NULL,
        name_ar VARCHAR(100) NOT NULL,
        images TEXT DEFAULT '[]',
        min_capacity INTEGER NOT NULL,
        max_capacity INTEGER NOT NULL,
        base_price DECIMAL(10, 2) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 插入测试数据
    await query(`
      INSERT INTO teapot_types (name, name_en, name_ar, images, min_capacity, max_capacity, base_price, description)
      VALUES 
      ('石瓢', 'Shi Piao', 'شيه پياو', '["https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20shi%20piao%20style%20front%20view&image_size=square", "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20shi%20piao%20style%20side%20view&image_size=square"]', 150, 300, 300, '经典壶型'),
      ('西施', 'Xi Shi', 'شي شي', '["https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20xi%20shi%20style%20front%20view&image_size=square", "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20xi%20shi%20style%20side%20view&image_size=square"]', 100, 250, 350, '最受欢迎'),
      ('井栏', 'Jing Lan', 'جينغ لان', '["https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20jing%20lan%20style%20front%20view&image_size=square", "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20jing%20lan%20style%20side%20view&image_size=square"]', 200, 400, 400, '方器代表'),
      ('仿古', 'Fang Gu', 'فانغ Гу', '["https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20fang%20gu%20style%20front%20view&image_size=square", "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zisha%20teapot%20fang%20gu%20style%20side%20view&image_size=square"]', 180, 350, 380, '经典器型')
    `);

    logMonitor('TEAPOT_TYPES', 'SUCCESS', { action: 'INIT_TEAPOT_TYPES', status: 'initialized' });
    
    return NextResponse.json({ message: 'Teapot types table initialized successfully' });
  } catch (error: any) {
    logMonitor('TEAPOT_TYPES', 'ERROR', { action: 'INIT_TEAPOT_TYPES', error: error?.message || String(error) });
    console.error('Error initializing teapot types table:', error);
    return NextResponse.json({ error: 'Failed to initialize teapot types table' }, { status: 500 });
  }
}
