import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const catId = parseInt(id);
    logApiRequest('PRODUCTS', 'PUT', `/api/admin/categories/${catId}`);
    const body = await request.json();
    const { name, name_en, name_ar, description, image, priority } = body;

    const existing = await query('SELECT * FROM categories WHERE id = ?', [catId]);
    if (existing.rows.length === 0) return createErrorResponse('NOT_FOUND', 404);

    const updates: string[] = [];
    const paramsArr: any[] = [];
    if (name !== undefined) { updates.push('name = ?'); paramsArr.push(name); }
    if (name_en !== undefined) { updates.push('name_en = ?'); paramsArr.push(name_en); }
    if (name_ar !== undefined) { updates.push('name_ar = ?'); paramsArr.push(name_ar); }
    if (description !== undefined) { updates.push('description = ?'); paramsArr.push(description); }
    if (image !== undefined) { updates.push('image = ?'); paramsArr.push(image); }
    if (priority !== undefined) { updates.push('priority = ?'); paramsArr.push(priority); }

    if (updates.length === 0) return createErrorResponse('NO_CHANGES', 400);

    paramsArr.push(catId);
    await query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, paramsArr);

    const updated = await query('SELECT * FROM categories WHERE id = ?', [catId]);
    logApiSuccess('PRODUCTS', 'UPDATE_CATEGORY', { catId });
    return createSuccessResponse(updated.rows[0]);
  } catch (error) {
    logApiError('PRODUCTS', 'UPDATE_CATEGORY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const catId = parseInt(id);
    logApiRequest('PRODUCTS', 'DELETE', `/api/admin/categories/${catId}`);

    const productCount = await query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [catId]);
    if ((productCount.rows[0]?.count || 0) > 0) {
      return createErrorResponse('CATEGORY_HAS_PRODUCTS', 400);
    }

    await query('DELETE FROM categories WHERE id = ?', [catId]);
    logApiSuccess('PRODUCTS', 'DELETE_CATEGORY', { catId });
    return createSuccessResponse({ message: '分类已删除' });
  } catch (error) {
    logApiError('PRODUCTS', 'DELETE_CATEGORY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
