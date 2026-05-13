import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';

export async function GET(request: NextRequest) {
  logApiRequest('CONTENT', 'GET', '/api/admin/content/about');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    await query(`CREATE TABLE IF NOT EXISTS about_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, title_en TEXT, title_ar TEXT,
      description TEXT, description_en TEXT, description_ar TEXT,
      content TEXT, content_en TEXT, content_ar TEXT,
      mission TEXT, mission_en TEXT, mission_ar TEXT,
      vision TEXT, vision_en TEXT, vision_ar TEXT,
      values_text TEXT, values_text_en TEXT, values_text_ar TEXT,
      images TEXT, video_url TEXT,
      teamMembers TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const result = await query('SELECT * FROM about_content WHERE id = 1');
    const about = result.rows[0];

    if (!about) {
      logApiSuccess('CONTENT', 'GET', { empty: true });
      return NextResponse.json({ success: true, data: null });
    }

    const data = {
      title: about.title || '',
      titleEn: about.title_en || '',
      titleAr: about.title_ar || '',
      description: about.description || '',
      descriptionEn: about.description_en || '',
      descriptionAr: about.description_ar || '',
      content: about.content || '',
      contentEn: about.content_en || '',
      contentAr: about.content_ar || '',
      mission: about.mission || '',
      missionEn: about.mission_en || '',
      missionAr: about.mission_ar || '',
      vision: about.vision || '',
      visionEn: about.vision_en || '',
      visionAr: about.vision_ar || '',
      values_text: about.values_text || '',
      valuesTextEn: about.values_text_en || '',
      valuesTextAr: about.values_text_ar || '',
      images: typeof about.images === 'string' ? JSON.parse(about.images || '[]') : (about.images || []),
      videoUrl: about.video_url || '',
      teamMembers: typeof about.teamMembers === 'string' ? JSON.parse(about.teamMembers || '[]') : (about.teamMembers || []),
    };

    logApiSuccess('CONTENT', 'GET');
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    logApiError('CONTENT', 'GET', error);
    return createErrorResponse('ABOUT_CONTENT_LOAD_FAILED', 500);
  }
}

export async function PUT(request: NextRequest) {
  logApiRequest('CONTENT', 'PUT', '/api/admin/content/about');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();

    const values = [
      body.title ?? '',
      body.titleEn ?? '',
      body.titleAr ?? '',
      body.description ?? '',
      body.descriptionEn ?? '',
      body.descriptionAr ?? '',
      body.content ?? '',
      body.contentEn ?? '',
      body.contentAr ?? '',
      body.mission ?? '',
      body.missionEn ?? '',
      body.missionAr ?? '',
      body.vision ?? '',
      body.visionEn ?? '',
      body.visionAr ?? '',
      body.values_text ?? '',
      body.valuesTextEn ?? '',
      body.valuesTextAr ?? '',
      Array.isArray(body.images) ? JSON.stringify(body.images) : '[]',
      body.videoUrl ?? '',
      Array.isArray(body.teamMembers) ? JSON.stringify(body.teamMembers) : '[]',
    ];

    const existing = await query('SELECT id FROM about_content WHERE id = 1');

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO about_content (title, title_en, title_ar, description, description_en, description_ar,
         content, content_en, content_ar, mission, mission_en, mission_ar, vision, vision_en, vision_ar,
         values_text, values_text_en, values_text_ar, images, video_url, teamMembers, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        values
      );
    } else {
      await query(
        `UPDATE about_content SET
         title = ?, title_en = ?, title_ar = ?, description = ?, description_en = ?, description_ar = ?,
         content = ?, content_en = ?, content_ar = ?, mission = ?, mission_en = ?, mission_ar = ?,
         vision = ?, vision_en = ?, vision_ar = ?, values_text = ?, values_text_en = ?, values_text_ar = ?,
         images = ?, video_url = ?, teamMembers = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
        values
      );
    }

    await recordAdminAuditLog({
      request,
      module: 'CONTENT',
      action: 'UPDATE_ABOUT',
      description: '管理员更新关于我们内容',
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: '1',
      resourceType: 'about_content',
      riskLevel: 'low',
    });

    logApiSuccess('CONTENT', 'PUT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logApiError('CONTENT', 'PUT', error);
    return createErrorResponse('ABOUT_CONTENT_UPDATE_FAILED', 500);
  }
}
