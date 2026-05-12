import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';

async function ensurePublishColumn() {
  try {
    await query("ALTER TABLE products ADD COLUMN publish_status VARCHAR(20) DEFAULT 'published'");
  } catch {}
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  logApiRequest('PRODUCTS', 'POST', '/api/admin/products/[id]/publish');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    await ensurePublishColumn();
    const { id } = await params;
    const productId = Number(id);

    const existing = await query('SELECT id, name, publish_status FROM products WHERE id = ?', [productId]);
    if (existing.rows.length === 0) {
      return createErrorResponse('PRODUCT_NOT_FOUND', 404);
    }

    await query("UPDATE products SET publish_status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [productId]);

    await recordAdminAuditLog({
      request,
      module: 'PRODUCTS',
      action: 'PUBLISH_PRODUCT',
      description: '管理员上架商品',
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: String(productId),
      resourceType: 'product',
      riskLevel: 'medium',
      metadata: { product_name: existing.rows[0].name },
    });

    logApiSuccess('PRODUCTS', 'POST');
    return NextResponse.json({ success: true, data: { id: productId, publish_status: 'published' } });
  } catch (error: any) {
    logApiError('PRODUCTS', 'POST', error);
    return createErrorResponse('PRODUCT_PUBLISH_FAILED', 500);
  }
}
