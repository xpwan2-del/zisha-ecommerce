import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

export async function ensureGuaranteesTable() {
  await query(`CREATE TABLE IF NOT EXISTS guarantees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    text_en TEXT,
    text_ar TEXT,
    color TEXT DEFAULT '#CA8A04',
    icon TEXT DEFAULT 'check-circle',
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}

function normalizeGuarantee(row: any) {
  return {
    id: row.id,
    text: row.text || '',
    text_en: row.text_en || '',
    text_ar: row.text_ar || '',
    color: row.color || '#CA8A04',
    icon: row.icon || 'check-circle',
    is_active: Boolean(row.is_active),
    order: Number(row.sort_order || 0),
    sort_order: Number(row.sort_order || 0),
  };
}

export async function GET() {
  try {
    logMonitor('GUARANTEES', 'REQUEST', { method: 'GET', action: 'GET_GUARANTEES' });
    await ensureGuaranteesTable();
    const result = await query('SELECT * FROM guarantees ORDER BY sort_order ASC, id ASC');
    const rows = result.rows.map(normalizeGuarantee);
    logMonitor('GUARANTEES', 'SUCCESS', { action: 'GET_GUARANTEES', count: rows.length });
    return NextResponse.json(rows);
  } catch (error: any) {
    logMonitor('GUARANTEES', 'ERROR', { action: 'GET_GUARANTEES', error: error?.message || String(error) });
    return NextResponse.json({ error: 'Failed to fetch guarantees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    logMonitor('GUARANTEES', 'REQUEST', { method: 'POST', action: 'CREATE_GUARANTEE' });
    await ensureGuaranteesTable();
    const body = await request.json();
    const result = await query(
      `INSERT INTO guarantees (text, text_en, text_ar, color, icon, is_active, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        body.text,
        body.text_en || '',
        body.text_ar || '',
        body.color || '#CA8A04',
        body.icon || 'check-circle',
        body.is_active === false ? 0 : 1,
        Number(body.order ?? body.sort_order ?? 0),
      ]
    );
    const created = await query('SELECT * FROM guarantees WHERE id = ?', [result.lastInsertRowid]);
    const data = normalizeGuarantee(created.rows[0]);
    logMonitor('GUARANTEES', 'SUCCESS', { action: 'CREATE_GUARANTEE', id: data.id });
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    logMonitor('GUARANTEES', 'ERROR', { action: 'CREATE_GUARANTEE', error: error?.message || String(error) });
    return NextResponse.json({ error: 'Failed to add guarantee' }, { status: 500 });
  }
}
