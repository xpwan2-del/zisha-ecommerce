import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { ensureHomeModulesTable } from '../route';

function normalizeModule(row: any) {
  return {
    ...row,
    is_active: Boolean(row.is_active),
    order: Number(row.sort_order || 0),
    sort_order: Number(row.sort_order || 0),
  };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  logApiRequest('CONTENT', 'PUT', '/api/admin/home-modules/[id]');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    await ensureHomeModulesTable();
    const { id } = await params;
    const moduleId = Number(id);
    const body = await request.json();
    const existing = await query('SELECT id FROM home_modules WHERE id = ?', [moduleId]);
    if (existing.rows.length === 0) {
      return createErrorResponse('HOME_MODULE_NOT_FOUND', 404);
    }
    await query(
      `UPDATE home_modules SET
        type = ?, title = ?, title_en = ?, title_ar = ?, description = ?, description_en = ?, description_ar = ?,
        image = ?, link = ?, button_text = ?, button_text_en = ?, button_text_ar = ?, button_link = ?,
        secondary_button_text = ?, secondary_button_text_en = ?, secondary_button_text_ar = ?, secondary_button_link = ?,
        is_active = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
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
        moduleId,
      ]
    );
    const updated = await query('SELECT * FROM home_modules WHERE id = ?', [moduleId]);

    await recordAdminAuditLog({
      request,
      module: 'CONTENT',
      action: 'UPDATE_HOME_MODULE',
      description: '管理员更新首页模块',
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: String(moduleId),
      resourceType: 'home_module',
      riskLevel: 'low',
      metadata: { changes: body },
    });

    logApiSuccess('CONTENT', 'PUT');
    return NextResponse.json({ success: true, data: normalizeModule(updated.rows[0]) });
  } catch (error: any) {
    logApiError('CONTENT', 'PUT', error);
    return createErrorResponse('HOME_MODULE_UPDATE_FAILED', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  logApiRequest('CONTENT', 'DELETE', '/api/admin/home-modules/[id]');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    await ensureHomeModulesTable();
    const { id } = await params;
    const moduleId = Number(id);
    const existing = await query('SELECT id FROM home_modules WHERE id = ?', [moduleId]);
    if (existing.rows.length === 0) {
      return createErrorResponse('HOME_MODULE_NOT_FOUND', 404);
    }
    await query('DELETE FROM home_modules WHERE id = ?', [moduleId]);

    await recordAdminAuditLog({
      request,
      module: 'CONTENT',
      action: 'DELETE_HOME_MODULE',
      description: '管理员删除首页模块',
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: String(moduleId),
      resourceType: 'home_module',
      riskLevel: 'low',
    });

    logApiSuccess('CONTENT', 'DELETE');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logApiError('CONTENT', 'DELETE', error);
    return createErrorResponse('HOME_MODULE_DELETE_FAILED', 500);
  }
}
