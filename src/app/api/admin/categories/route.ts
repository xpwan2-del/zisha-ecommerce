import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  logApiRequest('PRODUCTS', 'GET', '/api/admin/categories');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const result = await query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM products WHERE category_id = c.id) as product_count
       FROM categories c
       ORDER BY c.priority ASC, c.name ASC`
    );

    logApiSuccess('PRODUCTS', 'GET_CATEGORIES');
    return createSuccessResponse(result.rows);
  } catch (error) {
    logApiError('PRODUCTS', 'GET_CATEGORIES', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  logApiRequest('PRODUCTS', 'POST', '/api/admin/categories');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { name, name_en, name_ar, slug, description, image, priority } = body;

    if (!name || !slug) {
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const existing = await query('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (existing.rows.length > 0) return createErrorResponse('DUPLICATE_SLUG', 400);

    const result = await query(
      `INSERT INTO categories (name, name_en, name_ar, slug, description, image, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [name, name_en || '', name_ar || '', slug, description || '', image || '', priority || 0]
    );

    logApiSuccess('PRODUCTS', 'CREATE_CATEGORY', { slug });
    return createSuccessResponse({ id: result.lastInsertRowid, slug }, 201);
  } catch (error) {
    logApiError('PRODUCTS', 'CREATE_CATEGORY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
