import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    logMonitor('MATERIALS', 'REQUEST', { method: 'POST', action: 'INIT_MATERIALS' });

    await query(`
      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        name_en VARCHAR(100) NOT NULL,
        name_ar VARCHAR(100) NOT NULL,
        color VARCHAR(20) NOT NULL,
        description TEXT,
        price_modifier DECIMAL(10, 2) DEFAULT 0,
        stock INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      INSERT INTO materials (name, name_en, name_ar, color, description, price_modifier, stock)
      VALUES 
      ('紫泥', 'Zi Ni', 'زي ني', '#8B4513', '经典紫泥', 0, 100),
      ('红泥', 'Hong Ni', 'هونغ ني', '#CD5C5C', '透气性好', 50, 80),
      ('段泥', 'Duan Ni', 'دوان ني', '#D2B48C', '适合浅色茶', 100, 60),
      ('天青泥', 'Tian Qing Ni', 'تيان تشينغ ني', '#708090', '稀有泥料', 300, 30)
    `);

    logMonitor('MATERIALS', 'SUCCESS', { action: 'INIT_MATERIALS' });
    return NextResponse.json({ message: 'Materials table initialized successfully' });
  } catch (error: any) {
    logMonitor('MATERIALS', 'ERROR', { action: 'INIT_MATERIALS', error: error?.message || String(error) });
    console.error('Error initializing materials table:', error);
    return NextResponse.json({ error: 'Failed to initialize materials table' }, { status: 500 });
  }
}
