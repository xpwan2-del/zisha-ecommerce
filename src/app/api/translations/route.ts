import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {GET} /api/translations 获取翻译列表
 * @apiName GetTranslations
 * @apiGroup TRANSLATIONS
 * @apiDescription 获取翻译词条列表，支持分页和语言筛选。
 */


export async function GET(request: NextRequest) {
  try {
    logMonitor('TRANSLATIONS', 'REQUEST', { method: 'GET', action: 'GET_TRANSLATIONS' });
    
    const url = new URL(request.url);
    const language = url.searchParams.get('language');
    const key = url.searchParams.get('key');

    let sql = 'SELECT * FROM translations';
    const params: any[] = [];
    let conditions = [];

    if (language) {
      conditions.push(`language = ?`);
      params.push(language);
    }

    if (key) {
      conditions.push(`key = ?`);
      params.push(key);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await query(sql, params);
    
    // Transform result to i18n format
    const translationsByLanguage: any = {
      en: {},
      zh: {},
      ar: {}
    };
    
    result.rows.forEach((row: any) => {
      if (translationsByLanguage[row.language]) {
        // Convert dot notation keys to nested objects
        const keys = row.key.split('.');
        let current = translationsByLanguage[row.language];
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = row.value;
      }
    });
    
    logMonitor('TRANSLATIONS', 'SUCCESS', { action: 'GET_TRANSLATIONS', count: result.rows?.length || 0 });
    
    return NextResponse.json(translationsByLanguage);
  } catch (error: any) {
    logMonitor('TRANSLATIONS', 'ERROR', { action: 'GET_TRANSLATIONS', error: error?.message || String(error) });
    console.error('Error fetching translations:', error);
    return NextResponse.json({ error: 'Failed to fetch translations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    logMonitor('TRANSLATIONS', 'REQUEST', { method: 'POST', action: 'CREATE_TRANSLATION' });
    
    const body = await request.json();
    const { key, language, value } = body;

    if (!key || !language || !value) {
      logMonitor('TRANSLATIONS', 'VALIDATION_FAILED', { error: 'Missing required fields' });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 先尝试更新
    const updateResult = await query(
      `UPDATE translations SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ? AND language = ?`,
      [value, key, language]
    );

    // 如果没有更新任何行，则插入新记录
    if (!updateResult.changes || updateResult.changes === 0) {
      await query(
        `INSERT INTO translations (key, language, value) VALUES (?, ?, ?)`,
        [key, language, value]
      );
    }

    // 获取创建或更新的记录
    const result = await query(
      `SELECT * FROM translations WHERE key = ? AND language = ?`,
      [key, language]
    );

    logMonitor('TRANSLATIONS', 'SUCCESS', { action: 'CREATE_TRANSLATION', key, language });
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    logMonitor('TRANSLATIONS', 'ERROR', { action: 'CREATE_TRANSLATION', error: error?.message || String(error) });
    console.error('Error creating translation:', error);
    return NextResponse.json({ error: 'Failed to create translation' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    logMonitor('TRANSLATIONS', 'REQUEST', { method: 'PUT', action: 'UPDATE_TRANSLATION' });
    
    const body = await request.json();
    const { id, key, language, value } = body;

    if (!id) {
      logMonitor('TRANSLATIONS', 'VALIDATION_FAILED', { error: 'Missing translation ID' });
      return NextResponse.json({ error: 'Missing translation ID' }, { status: 400 });
    }

    const updateResult = await query(
      `UPDATE translations
       SET key = ?, language = ?, value = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [key, language, value, id]
    );

    if (!updateResult.changes || updateResult.changes === 0) {
      logMonitor('TRANSLATIONS', 'NOT_FOUND', { translationId: id });
      return NextResponse.json({ error: 'Translation not found' }, { status: 404 });
    }

    // 获取更新后的记录
    const updatedResult = await query(
      `SELECT * FROM translations WHERE id = ?`,
      [id]
    );

    logMonitor('TRANSLATIONS', 'SUCCESS', { action: 'UPDATE_TRANSLATION', translationId: id });
    
    return NextResponse.json(updatedResult.rows[0]);
  } catch (error: any) {
    logMonitor('TRANSLATIONS', 'ERROR', { action: 'UPDATE_TRANSLATION', error: error?.message || String(error) });
    console.error('Error updating translation:', error);
    return NextResponse.json({ error: 'Failed to update translation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    logMonitor('TRANSLATIONS', 'REQUEST', { method: 'DELETE', action: 'DELETE_TRANSLATION' });
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      logMonitor('TRANSLATIONS', 'VALIDATION_FAILED', { error: 'Missing translation ID' });
      return NextResponse.json({ error: 'Missing translation ID' }, { status: 400 });
    }

    const deleteResult = await query(
      'DELETE FROM translations WHERE id = ?',
      [id]
    );

    if (!deleteResult.changes || deleteResult.changes === 0) {
      logMonitor('TRANSLATIONS', 'NOT_FOUND', { translationId: id });
      return NextResponse.json({ error: 'Translation not found' }, { status: 404 });
    }

    logMonitor('TRANSLATIONS', 'SUCCESS', { action: 'DELETE_TRANSLATION', translationId: id });
    
    return NextResponse.json({ message: 'Translation deleted successfully' });
  } catch (error: any) {
    logMonitor('TRANSLATIONS', 'ERROR', { action: 'DELETE_TRANSLATION', error: error?.message || String(error) });
    console.error('Error deleting translation:', error);
    return NextResponse.json({ error: 'Failed to delete translation' }, { status: 500 });
  }
}
