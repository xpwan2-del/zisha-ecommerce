import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';

export async function ensureHomeModulesTable() {
  await query(`CREATE TABLE IF NOT EXISTS home_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    title_en TEXT,
    title_ar TEXT,
    description TEXT,
    description_en TEXT,
    description_ar TEXT,
    image TEXT,
    link TEXT,
    button_text TEXT,
    button_text_en TEXT,
    button_text_ar TEXT,
    button_link TEXT,
    secondary_button_text TEXT,
    secondary_button_text_en TEXT,
    secondary_button_text_ar TEXT,
    secondary_button_link TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}

function normalizeModule(row: any) {
  return {
    ...row,
    is_active: Boolean(row.is_active),
    order: Number(row.sort_order || 0),
    sort_order: Number(row.sort_order || 0),
  };
}

const moduleFields = `type, title, title_en, title_ar, description, description_en, description_ar, image, link, button_text, button_text_en, button_text_ar, button_link, secondary_button_text, secondary_button_text_en, secondary_button_text_ar, secondary_button_link, is_active, sort_order`;

export async function GET(request: NextRequest) {
  logApiRequest('CONTENT', 'GET', '/api/admin/home-modules');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    await ensureHomeModulesTable();
    const result = await query('SELECT * FROM home_modules ORDER BY sort_order ASC, id ASC');
    logApiSuccess('CONTENT', 'GET', { count: result.rows.length });
    return NextResponse.json({ success: true, data: result.rows.map(normalizeModule) });
  } catch (error: any) {
    logApiError('CONTENT', 'GET', error);
    return createErrorResponse('HOME_MODULES_LOAD_FAILED', 500);
  }
}

export async function POST(request: NextRequest) {
  logApiRequest('CONTENT', 'POST', '/api/admin/home-modules');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    await ensureHomeModulesTable();
    const body = await request.json();
    const values = [
      body.type,
      body.title,
      body.title_en || '',
      body.title_ar || '',
      body.description || '',
      body.description_en || '',
      body.description_ar || '',
      body.image || '',
      body.link || '',
      body.button_text || '',
      body.button_text_en || '',
      body.button_text_ar || '',
      body.button_link || '',
      body.secondary_button_text || '',
      body.secondary_button_text_en || '',
      body.secondary_button_text_ar || '',
      body.secondary_button_link || '',
      body.is_active === false ? 0 : 1,
      Number(body.order ?? body.sort_order ?? 0),
    ];
    const placeholders = values.map(() => '?').join(', ');
    const result = await query(
      `INSERT INTO home_modules (${moduleFields}, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP)`,
      values
    );
    const created = await query('SELECT * FROM home_modules WHERE id = ?', [result.lastInsertRowid]);

    await recordAdminAuditLog({
      request,
      module: 'CONTENT',
      action: 'CREATE_HOME_MODULE',
      description: '管理员新增首页模块',
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: String(result.lastInsertRowid),
      resourceType: 'home_module',
      riskLevel: 'low',
      metadata: { type: body.type, title: body.title },
    });

    logApiSuccess('CONTENT', 'POST');
    return NextResponse.json({ success: true, data: normalizeModule(created.rows[0]) }, { status: 201 });
  } catch (error: any) {
    logApiError('CONTENT', 'POST', error);
    return createErrorResponse('HOME_MODULE_CREATE_FAILED', 500);
  }
}
