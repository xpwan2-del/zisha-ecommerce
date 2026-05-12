import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';

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

export async function GET(request: NextRequest) {
  logApiRequest('CONTENT', 'GET', '/api/admin/guarantees');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    await ensureGuaranteesTable();
    const result = await query('SELECT * FROM guarantees ORDER BY sort_order ASC, id ASC');
    const rows = result.rows.map(normalizeGuarantee);
    logApiSuccess('CONTENT', 'GET', { count: rows.length });
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    logApiError('CONTENT', 'GET', error);
    return createErrorResponse('GUARANTEES_LOAD_FAILED', 500);
  }
}

export async function POST(request: NextRequest) {
  logApiRequest('CONTENT', 'POST', '/api/admin/guarantees');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
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

    await recordAdminAuditLog({
      request,
      module: 'CONTENT',
      action: 'CREATE_GUARANTEE',
      description: '管理员新增服务保证',
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: String(data.id),
      resourceType: 'guarantee',
      riskLevel: 'low',
      metadata: { text: body.text },
    });

    logApiSuccess('CONTENT', 'POST', { id: data.id });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    logApiError('CONTENT', 'POST', error);
    return createErrorResponse('GUARANTEE_CREATE_FAILED', 500);
  }
}
