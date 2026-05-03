import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {GET} /api/materials 获取原材料列表
 * @apiName GetMaterials
 * @apiGroup MATERIALS
 * @apiDescription 获取紫砂壶原材料分类列表。
 */


export async function GET(request: NextRequest) {
  try {
    logMonitor('MATERIALS', 'REQUEST', { method: 'GET', action: 'GET_MATERIALS' });

    const result = await query('SELECT * FROM materials ORDER BY name');
    logMonitor('MATERIALS', 'SUCCESS', { action: 'GET_MATERIALS', count: result.rows.length });
    return NextResponse.json(result.rows);
  } catch (error: any) {
    logMonitor('MATERIALS', 'ERROR', { action: 'GET_MATERIALS', error: error?.message || String(error) });
    console.error('Error fetching materials:', error);
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    logMonitor('MATERIALS', 'REQUEST', { method: 'POST', action: 'CREATE_MATERIAL' });

    const body = await request.json();
    const { name, name_en, name_ar, color, description, price_modifier, stock } = body;
    
    const insertResult = await query(
      `INSERT INTO materials (name, name_en, name_ar, color, description, price_modifier, stock)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, name_en, name_ar, color, description, price_modifier || 0, stock]
    );

    const newMaterial = await query('SELECT * FROM materials WHERE id = ?', [insertResult.lastInsertRowid]);

    logMonitor('MATERIALS', 'SUCCESS', { action: 'CREATE_MATERIAL', id: insertResult.lastInsertRowid });
    return NextResponse.json(newMaterial.rows[0], { status: 201 });
  } catch (error: any) {
    logMonitor('MATERIALS', 'ERROR', { action: 'CREATE_MATERIAL', error: error?.message || String(error) });
    console.error('Error creating material:', error);
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
  }
}