import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
import { ensureGuaranteesTable } from '../route';

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    logMonitor('GUARANTEES', 'REQUEST', { method: 'PUT', action: 'UPDATE_GUARANTEE' });
    await ensureGuaranteesTable();
    const { id } = await params;
    const body = await request.json();
    const guaranteeId = Number(id);
    const existing = await query('SELECT id FROM guarantees WHERE id = ?', [guaranteeId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Guarantee not found' }, { status: 404 });
    }
    await query(
      `UPDATE guarantees
       SET text = ?, text_en = ?, text_ar = ?, color = ?, icon = ?, is_active = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        body.text,
        body.text_en || '',
        body.text_ar || '',
        body.color || '#CA8A04',
        body.icon || 'check-circle',
        body.is_active === false ? 0 : 1,
        Number(body.order ?? body.sort_order ?? 0),
        guaranteeId,
      ]
    );
    const updated = await query('SELECT * FROM guarantees WHERE id = ?', [guaranteeId]);
    logMonitor('GUARANTEES', 'SUCCESS', { action: 'UPDATE_GUARANTEE', id: guaranteeId });
    return NextResponse.json(normalizeGuarantee(updated.rows[0]));
  } catch (error: any) {
    logMonitor('GUARANTEES', 'ERROR', { action: 'UPDATE_GUARANTEE', error: error?.message || String(error) });
    return NextResponse.json({ error: 'Failed to update guarantee' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    logMonitor('GUARANTEES', 'REQUEST', { method: 'DELETE', action: 'DELETE_GUARANTEE' });
    await ensureGuaranteesTable();
    const { id } = await params;
    const guaranteeId = Number(id);
    const existing = await query('SELECT id FROM guarantees WHERE id = ?', [guaranteeId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Guarantee not found' }, { status: 404 });
    }
    await query('DELETE FROM guarantees WHERE id = ?', [guaranteeId]);
    logMonitor('GUARANTEES', 'SUCCESS', { action: 'DELETE_GUARANTEE', id: guaranteeId });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logMonitor('GUARANTEES', 'ERROR', { action: 'DELETE_GUARANTEE', error: error?.message || String(error) });
    return NextResponse.json({ error: 'Failed to delete guarantee' }, { status: 500 });
  }
}
