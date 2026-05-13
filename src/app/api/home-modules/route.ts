import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureHomeModulesTable } from '@/app/api/admin/home-modules/route';

function normalizeModule(row: any) {
  return {
    ...row,
    is_active: Boolean(row.is_active),
    order: Number(row.sort_order || 0),
    sort_order: Number(row.sort_order || 0),
  };
}

export async function GET(_request: NextRequest) {
  try {
    await ensureHomeModulesTable();
    const result = await query('SELECT * FROM home_modules WHERE is_active = 1 ORDER BY sort_order ASC, id ASC');
    return NextResponse.json({ success: true, data: result.rows.map(normalizeModule) });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'HOME_MODULES_LOAD_FAILED' }, { status: 500 });
  }
}
