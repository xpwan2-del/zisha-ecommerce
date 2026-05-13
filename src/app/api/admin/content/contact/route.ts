import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';

export async function GET(request: NextRequest) {
  logApiRequest('CONTENT', 'GET', '/api/admin/content/contact');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    await query(`CREATE TABLE IF NOT EXISTS contact_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      images TEXT,
      video_url TEXT,
      address TEXT,
      email TEXT,
      phone TEXT,
      opening_hours TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const result = await query('SELECT * FROM contact_content WHERE id = 1');
    const contact = result.rows[0];

    if (!contact) {
      logApiSuccess('CONTENT', 'GET', { empty: true });
      return NextResponse.json({ success: true, data: null });
    }

    const data = {
      title: contact.title || '',
      description: contact.description || '',
      images: typeof contact.images === 'string' ? JSON.parse(contact.images || '[]') : (contact.images || []),
      videoUrl: contact.video_url || '',
      address: contact.address || '',
      email: contact.email || '',
      phone: contact.phone || '',
      openingHours: contact.opening_hours || '',
    };

    logApiSuccess('CONTENT', 'GET');
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    logApiError('CONTENT', 'GET', error);
    return createErrorResponse('CONTACT_CONTENT_LOAD_FAILED', 500);
  }
}

export async function PUT(request: NextRequest) {
  logApiRequest('CONTENT', 'PUT', '/api/admin/content/contact');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();

    const values = [
      body.title ?? '',
      body.description ?? '',
      Array.isArray(body.images) ? JSON.stringify(body.images) : '[]',
      body.videoUrl ?? '',
      body.address ?? '',
      body.email ?? '',
      body.phone ?? '',
      body.openingHours ?? '',
    ];

    const existing = await query('SELECT id FROM contact_content WHERE id = 1');

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO contact_content (title, description, images, video_url, address, email, phone, opening_hours, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        values
      );
    } else {
      await query(
        `UPDATE contact_content SET
         title = ?, description = ?, images = ?, video_url = ?, address = ?, email = ?, phone = ?, opening_hours = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
        values
      );
    }

    await recordAdminAuditLog({
      request,
      module: 'CONTENT',
      action: 'UPDATE_CONTACT',
      description: '管理员更新联系我们内容',
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: '1',
      resourceType: 'contact_content',
      riskLevel: 'low',
    });

    logApiSuccess('CONTENT', 'PUT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logApiError('CONTENT', 'PUT', error);
    return createErrorResponse('CONTACT_CONTENT_UPDATE_FAILED', 500);
  }
}
