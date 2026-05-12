import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';
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
  logApiRequest('CONTENT', 'PUT', '/api/admin/guarantees/[id]');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    await ensureGuaranteesTable();
    const { id } = await params;
    const guaranteeId = Number(id);
    const body = await request.json();

    const existing = await query('SELECT id FROM guarantees WHERE id = ?', [guaranteeId]);
    if (existing.rows.length === 0) {
      return createErrorResponse('GUARANTEE_NOT_FOUND', 404);
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
    const data = normalizeGuarantee(updated.rows[0]);

    await recordAdminAuditLog({
      request,
      module: 'CONTENT',
      action: 'UPDATE_GUARANTEE',
      description: '管理员更新服务保证',
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: String(guaranteeId),
      resourceType: 'guarantee',
      riskLevel: 'low',
      metadata: { changes: body },
    });

    logApiSuccess('CONTENT', 'PUT');
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    logApiError('CONTENT', 'PUT', error);
    return createErrorResponse('GUARANTEE_UPDATE_FAILED', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  logApiRequest('CONTENT', 'DELETE', '/api/admin/guarantees/[id]');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    await ensureGuaranteesTable();
    const { id } = await params;
    const guaranteeId = Number(id);

    const existing = await query('SELECT id FROM guarantees WHERE id = ?', [guaranteeId]);
    if (existing.rows.length === 0) {
      return createErrorResponse('GUARANTEE_NOT_FOUND', 404);
    }

    await query('DELETE FROM guarantees WHERE id = ?', [guaranteeId]);

    await recordAdminAuditLog({
      request,
      module: 'CONTENT',
      action: 'DELETE_GUARANTEE',
      description: '管理员删除服务保证',
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: String(guaranteeId),
      resourceType: 'guarantee',
      riskLevel: 'low',
    });

    logApiSuccess('CONTENT', 'DELETE');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logApiError('CONTENT', 'DELETE', error);
    return createErrorResponse('GUARANTEE_DELETE_FAILED', 500);
  }
}
