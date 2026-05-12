import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { logMonitor } from '@/lib/utils/logger';
import { checkAdminAuth } from '@/lib/admin-helpers';

const ALLOWED_LANGUAGES = new Set(['zh', 'en', 'ar']);
const TRANSLATION_KEY_PATTERN = /^[a-zA-Z0-9]+(?:[._-][a-zA-Z0-9]+)*$/;
const MAX_TRANSLATION_VALUE_LENGTH = 5000;

function validateTranslationPayload(key: unknown, language: unknown, value: unknown) {
  if (typeof key !== 'string' || !TRANSLATION_KEY_PATTERN.test(key) || key.length > 200) {
    return 'INVALID_TRANSLATION_KEY';
  }
  if (typeof language !== 'string' || !ALLOWED_LANGUAGES.has(language)) {
    return 'INVALID_LANGUAGE';
  }
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_TRANSLATION_VALUE_LENGTH) {
    return 'INVALID_TRANSLATION_VALUE';
  }
  return null;
}

function toNestedTranslations(rows: any[]) {
  const translationsByLanguage: any = {
    en: {},
    zh: {},
    ar: {}
  };

  rows.forEach((row: any) => {
    if (!translationsByLanguage[row.language]) return;
    const keys = String(row.key || '').split('.');
    let current = translationsByLanguage[row.language];

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = row.value;
  });

  return translationsByLanguage;
}

export async function GET(request: NextRequest) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    logMonitor('TRANSLATIONS', 'REQUEST', { method: 'GET', action: 'GET_TRANSLATIONS' });

    const url = new URL(request.url);
    const language = url.searchParams.get('language');
    const key = url.searchParams.get('key');

    if (language && !ALLOWED_LANGUAGES.has(language)) {
      return NextResponse.json({ error: 'INVALID_LANGUAGE' }, { status: 400 });
    }

    if (key && (!TRANSLATION_KEY_PATTERN.test(key) || key.length > 200)) {
      return NextResponse.json({ error: 'INVALID_TRANSLATION_KEY' }, { status: 400 });
    }

    let sql = 'SELECT * FROM translations';
    const params: any[] = [];
    const conditions: string[] = [];

    if (language) {
      conditions.push('language = ?');
      params.push(language);
    }

    if (key) {
      conditions.push('key = ?');
      params.push(key);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await query(sql, params);
    logMonitor('TRANSLATIONS', 'SUCCESS', { action: 'GET_TRANSLATIONS', count: result.rows?.length || 0 });

    return NextResponse.json(toNestedTranslations(result.rows || []));
  } catch (error: any) {
    logMonitor('TRANSLATIONS', 'ERROR', { action: 'GET_TRANSLATIONS', error: error?.message || String(error) });
    console.error('Error fetching translations:', error);
    return NextResponse.json({ error: 'Failed to fetch translations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    logMonitor('TRANSLATIONS', 'REQUEST', { method: 'POST', action: 'CREATE_TRANSLATION' });

    const body = await request.json();
    const { key, language, value } = body;
    const validationError = validateTranslationPayload(key, language, value);

    if (validationError) {
      logMonitor('TRANSLATIONS', 'VALIDATION_FAILED', { error: validationError });
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const existingResult = await query(
      'SELECT id, value FROM translations WHERE key = ? AND language = ?',
      [key, language]
    );
    const existed = existingResult.rows.length > 0;

    if (existed) {
      await query(
        'UPDATE translations SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ? AND language = ?',
        [value, key, language]
      );
    } else {
      await query(
        'INSERT INTO translations (key, language, value) VALUES (?, ?, ?)',
        [key, language, value]
      );
    }

    const result = await query(
      'SELECT * FROM translations WHERE key = ? AND language = ?',
      [key, language]
    );

    await recordAdminAuditLog({
      request,
      module: 'TRANSLATIONS',
      action: existed ? 'UPDATE_TRANSLATION' : 'CREATE_TRANSLATION',
      description: existed ? `管理员更新翻译: ${language}.${key}` : `管理员新增翻译: ${language}.${key}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: result.rows[0]?.id || key,
      resourceType: 'translation',
      riskLevel: 'medium',
      metadata: { key, language, existed }
    });

    logMonitor('TRANSLATIONS', 'SUCCESS', { action: 'CREATE_TRANSLATION', key, language });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    logMonitor('TRANSLATIONS', 'ERROR', { action: 'CREATE_TRANSLATION', error: error?.message || String(error) });
    console.error('Error creating translation:', error);
    return NextResponse.json({ error: 'Failed to create translation' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    logMonitor('TRANSLATIONS', 'REQUEST', { method: 'PUT', action: 'UPDATE_TRANSLATION' });

    const body = await request.json();
    const { id, key, language, value } = body;
    const translationId = Number.parseInt(String(id), 10);

    if (!Number.isInteger(translationId) || translationId <= 0) {
      logMonitor('TRANSLATIONS', 'VALIDATION_FAILED', { error: 'Missing translation ID' });
      return NextResponse.json({ error: 'INVALID_TRANSLATION_ID' }, { status: 400 });
    }

    const validationError = validateTranslationPayload(key, language, value);
    if (validationError) {
      logMonitor('TRANSLATIONS', 'VALIDATION_FAILED', { error: validationError });
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const beforeResult = await query('SELECT * FROM translations WHERE id = ?', [translationId]);
    if (!beforeResult.rows.length) {
      logMonitor('TRANSLATIONS', 'NOT_FOUND', { translationId });
      return NextResponse.json({ error: 'Translation not found' }, { status: 404 });
    }

    const updateResult = await query(
      `UPDATE translations
       SET key = ?, language = ?, value = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [key, language, value, translationId]
    );

    if (!updateResult.changes || updateResult.changes === 0) {
      logMonitor('TRANSLATIONS', 'NOT_FOUND', { translationId });
      return NextResponse.json({ error: 'Translation not found' }, { status: 404 });
    }

    const updatedResult = await query('SELECT * FROM translations WHERE id = ?', [translationId]);

    await recordAdminAuditLog({
      request,
      module: 'TRANSLATIONS',
      action: 'UPDATE_TRANSLATION',
      description: `管理员更新翻译: ${language}.${key}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: translationId,
      resourceType: 'translation',
      riskLevel: 'medium',
      metadata: { id: translationId, before: beforeResult.rows[0], after: updatedResult.rows[0] }
    });

    logMonitor('TRANSLATIONS', 'SUCCESS', { action: 'UPDATE_TRANSLATION', translationId });

    return NextResponse.json(updatedResult.rows[0]);
  } catch (error: any) {
    logMonitor('TRANSLATIONS', 'ERROR', { action: 'UPDATE_TRANSLATION', error: error?.message || String(error) });
    console.error('Error updating translation:', error);
    return NextResponse.json({ error: 'Failed to update translation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    logMonitor('TRANSLATIONS', 'REQUEST', { method: 'DELETE', action: 'DELETE_TRANSLATION' });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const translationId = Number.parseInt(String(id), 10);

    if (!Number.isInteger(translationId) || translationId <= 0) {
      logMonitor('TRANSLATIONS', 'VALIDATION_FAILED', { error: 'Missing translation ID' });
      return NextResponse.json({ error: 'INVALID_TRANSLATION_ID' }, { status: 400 });
    }

    const beforeResult = await query('SELECT * FROM translations WHERE id = ?', [translationId]);
    if (!beforeResult.rows.length) {
      logMonitor('TRANSLATIONS', 'NOT_FOUND', { translationId });
      return NextResponse.json({ error: 'Translation not found' }, { status: 404 });
    }

    const deleteResult = await query('DELETE FROM translations WHERE id = ?', [translationId]);

    if (!deleteResult.changes || deleteResult.changes === 0) {
      logMonitor('TRANSLATIONS', 'NOT_FOUND', { translationId });
      return NextResponse.json({ error: 'Translation not found' }, { status: 404 });
    }

    await recordAdminAuditLog({
      request,
      module: 'TRANSLATIONS',
      action: 'DELETE_TRANSLATION',
      description: `管理员删除翻译: ${beforeResult.rows[0].language}.${beforeResult.rows[0].key}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: translationId,
      resourceType: 'translation',
      riskLevel: 'high',
      metadata: { deleted: beforeResult.rows[0] }
    });

    logMonitor('TRANSLATIONS', 'SUCCESS', { action: 'DELETE_TRANSLATION', translationId });

    return NextResponse.json({ message: 'Translation deleted successfully' });
  } catch (error: any) {
    logMonitor('TRANSLATIONS', 'ERROR', { action: 'DELETE_TRANSLATION', error: error?.message || String(error) });
    console.error('Error deleting translation:', error);
    return NextResponse.json({ error: 'Failed to delete translation' }, { status: 500 });
  }
}
