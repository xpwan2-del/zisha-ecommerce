import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configKey = searchParams.get('key');

    if (configKey) {
      const result = await query(
        'SELECT * FROM system_configs WHERE config_key = ?',
        [configKey]
      );
      return NextResponse.json(result.rows[0] || null);
    }

    const result = await query('SELECT * FROM system_configs ORDER BY id');
    
    const configs: Record<string, boolean> = {};
    result.rows.forEach((row: any) => {
      configs[row.config_key] = row.config_value === 'true';
    });

    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching system configs:', error);
    return NextResponse.json({ 
      module_hero: true,
      module_categories: true,
      module_featured_products: true,
      module_about: true,
      module_testimonials: true,
      module_contact: true,
      module_customize: false,
      module_lucky_draw: false
    }, { status: 200 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { config_key, config_value } = data;

    if (!config_key || !config_value) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await query(
      `INSERT INTO system_configs (config_key, config_value) VALUES (?, ?)
       ON CONFLICT(config_key) DO UPDATE SET config_value = ?, updated_at = CURRENT_TIMESTAMP`,
      [config_key, config_value, config_value]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating system config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
