import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createSuccessResponse, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';

const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateCategorySlug(slug: unknown) {
  if (typeof slug !== 'string' || !CATEGORY_SLUG_PATTERN.test(slug)) return 'INVALID_SLUG';
  return null;
}

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

    const slugError = validateCategorySlug(slug);
    if (slugError) return createErrorResponse(slugError, 400);

    const existing = await query('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (existing.rows.length > 0) return createErrorResponse('CATEGORY_SLUG_EXISTS', 400);

    const result = await query(
      `INSERT INTO categories (name, name_en, name_ar, slug, description, image, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [name, name_en || '', name_ar || '', slug, description || '', image || '', priority || 0]
    );

    await recordAdminAuditLog({
      request,
      module: 'PRODUCTS',
      action: 'CREATE_CATEGORY',
      description: `管理员新增分类: ${name}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: Number(result.lastInsertRowid || 0),
      resourceType: 'category',
      riskLevel: 'medium',
      metadata: { slug }
    });

    logApiSuccess('PRODUCTS', 'CREATE_CATEGORY', { slug });
    return createSuccessResponse({ id: result.lastInsertRowid, slug }, 201);
  } catch (error) {
    logApiError('PRODUCTS', 'CREATE_CATEGORY', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
