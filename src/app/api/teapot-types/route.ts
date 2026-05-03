import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {GET} /api/teapot-types 获取壶型列表
 * @apiName GetTeapotTypes
 * @apiGroup TEAPOT_TYPES
 * @apiDescription 获取紫砂壶壶型分类列表。
 */


export async function GET(request: NextRequest) {
  try {
    logMonitor('TEAPOT_TYPES', 'REQUEST', { method: 'GET', action: 'GET_TEAPOT_TYPES' });
    
    const result = await query('SELECT * FROM teapot_types WHERE status = ? ORDER BY name', ['active']);
    
    logMonitor('TEAPOT_TYPES', 'SUCCESS', { action: 'GET_TEAPOT_TYPES', count: result.rows?.length || 0 });
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    logMonitor('TEAPOT_TYPES', 'ERROR', { action: 'GET_TEAPOT_TYPES', error: error?.message || String(error) });
    console.error('Error fetching teapot types:', error);
    return NextResponse.json({ error: 'Failed to fetch teapot types' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    logMonitor('TEAPOT_TYPES', 'REQUEST', { method: 'POST', action: 'CREATE_TEAPOT_TYPE' });
    
    const body = await request.json();
    const { name, name_en, name_ar, images, min_capacity, max_capacity, base_price, description } = body;
    
    const insertResult = await query(
      `INSERT INTO teapot_types (name, name_en, name_ar, images, min_capacity, max_capacity, base_price, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, name_en, name_ar, images || [], min_capacity, max_capacity, base_price, description]
    );

    const newTeapotType = await query('SELECT * FROM teapot_types WHERE id = ?', [insertResult.lastInsertRowid]);

    logMonitor('TEAPOT_TYPES', 'SUCCESS', { action: 'CREATE_TEAPOT_TYPE', teapotTypeId: insertResult.lastInsertRowid });
    
    return NextResponse.json(newTeapotType.rows[0], { status: 201 });
  } catch (error: any) {
    logMonitor('TEAPOT_TYPES', 'ERROR', { action: 'CREATE_TEAPOT_TYPE', error: error?.message || String(error) });
    console.error('Error creating teapot type:', error);
    return NextResponse.json({ error: 'Failed to create teapot type' }, { status: 500 });
  }
}