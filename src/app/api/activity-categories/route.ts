import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logMonitor } from '@/lib/utils/logger';

// GET /api/activity-categories - Get all activity categories with product counts
export async function GET(request: NextRequest) {
  try {
    logMonitor('ACTIVITY_CATEGORIES', 'REQUEST', { method: 'GET', action: 'GET_ACTIVITY_CATEGORIES' });
    
    const url = new URL(request.url);
    const withStats = url.searchParams.get('with_stats') === 'true';

    // 查询所有活动分类
    const categoriesResult = await query(`
      SELECT id, name, name_en, name_ar, icon_url, color, status, created_at, updated_at
      FROM activity_categories
      ORDER BY id ASC
    `);

    const categories = categoriesResult.rows || [];

    // 如果需要统计信息，查询每个分类关联的产品数量
    if (withStats) {
      const categoriesWithStats = await Promise.all(
        categories.map(async (category: any) => {
          // 查询该分类关联的产品数量
          const countResult = await query(
            `SELECT COUNT(*) as count FROM product_activities WHERE activity_category_id = ?`,
            [category.id]
          );
          const productCount = parseInt(String(countResult.rows?.[0]?.count || 0));

          // 查询该分类下的产品ID列表（最多5个）
          const productsResult = await query(
            `SELECT p.id, p.name, p.image
             FROM product_activities pa
             JOIN products p ON pa.product_id = p.id
             WHERE pa.activity_category_id = ?
             LIMIT 5`,
            [category.id]
          );

          return {
            ...category,
            product_count: productCount,
            sample_products: productsResult.rows || []
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: categories
      });
    }
    
    logMonitor('ACTIVITY_CATEGORIES', 'SUCCESS', { action: 'GET_ACTIVITY_CATEGORIES', count: categories.length });
    
    return NextResponse.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    logMonitor('ACTIVITY_CATEGORIES', 'ERROR', { action: 'GET_ACTIVITY_CATEGORIES', error: error?.message || String(error) });
    console.error('Error getting activity categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get activity categories' },
      { status: 500 }
    );
  }
}

// POST /api/activity-categories - Create new activity category
export async function POST(request: NextRequest) {
  try {
    logMonitor('ACTIVITY_CATEGORIES', 'REQUEST', { method: 'POST', action: 'CREATE_ACTIVITY_CATEGORY' });
    
    const data = await request.json();
    const { name, name_en, name_ar, icon_url, color, status = 'active' } = data;

    const insertResult = await query(
      `INSERT INTO activity_categories (name, name_en, name_ar, icon_url, color, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [name, name_en, name_ar, icon_url, color, status]
    );

    const categoryId = insertResult.lastInsertRowid;

    // 记录活动日志
    await query(
      `INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        'activity_category',
        'create',
        categoryId,
        name,
        JSON.stringify({ name, name_en, icon_url }),
        'system'
      ]
    );

    logMonitor('ACTIVITY_CATEGORIES', 'SUCCESS', { action: 'CREATE_ACTIVITY_CATEGORY', categoryId });
    
    return NextResponse.json({
      success: true,
      data: {
        id: categoryId,
        name,
        name_en,
        name_ar,
        icon_url,
        color,
        status
      }
    }, { status: 201 });

  } catch (error: any) {
    logMonitor('ACTIVITY_CATEGORIES', 'ERROR', { action: 'CREATE_ACTIVITY_CATEGORY', error: error?.message || String(error) });
    console.error('Error creating activity category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create activity category' },
      { status: 500 }
    );
  }
}

// PUT /api/activity-categories - Update activity category
export async function PUT(request: NextRequest) {
  try {
    logMonitor('ACTIVITY_CATEGORIES', 'REQUEST', { method: 'PUT', action: 'UPDATE_ACTIVITY_CATEGORY' });
    
    const { id, name, name_en, name_ar, icon_url, color, status } = await request.json();

    if (!id) {
      logMonitor('ACTIVITY_CATEGORIES', 'VALIDATION_FAILED', { error: 'Activity category ID is required' });
      return NextResponse.json(
        { success: false, error: 'Activity category ID is required' },
        { status: 400 }
      );
    }

    // 获取旧数据用于日志
    const oldCategoryResult = await query(
      'SELECT name FROM activity_categories WHERE id = ?',
      [id]
    );
    const oldName = oldCategoryResult.rows?.[0]?.name;

    const updateResult = await query(
      `UPDATE activity_categories SET name = ?, name_en = ?, name_ar = ?, icon_url = ?, color = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [name, name_en, name_ar, icon_url, color, status, id]
    );

    if (!updateResult.changes || updateResult.changes === 0) {
      logMonitor('ACTIVITY_CATEGORIES', 'NOT_FOUND', { categoryId: id });
      return NextResponse.json(
        { success: false, error: 'Activity category not found' },
        { status: 404 }
      );
    }

    // 记录活动日志
    await query(
      `INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        'activity_category',
        'update',
        id,
        name,
        JSON.stringify({ old_name: oldName, new_name: name, icon_url }),
        'system'
      ]
    );

    logMonitor('ACTIVITY_CATEGORIES', 'SUCCESS', { action: 'UPDATE_ACTIVITY_CATEGORY', categoryId: id });
    
    return NextResponse.json({
      success: true,
      data: { id, name, name_en, name_ar, icon_url, color, status }
    });

  } catch (error: any) {
    logMonitor('ACTIVITY_CATEGORIES', 'ERROR', { action: 'UPDATE_ACTIVITY_CATEGORY', error: error?.message || String(error) });
    console.error('Error updating activity category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update activity category' },
      { status: 500 }
    );
  }
}

// DELETE /api/activity-categories - Delete activity category
export async function DELETE(request: NextRequest) {
  try {
    logMonitor('ACTIVITY_CATEGORIES', 'REQUEST', { method: 'DELETE', action: 'DELETE_ACTIVITY_CATEGORY' });
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      logMonitor('ACTIVITY_CATEGORIES', 'VALIDATION_FAILED', { error: 'Activity category ID is required' });
      return NextResponse.json(
        { success: false, error: 'Activity category ID is required' },
        { status: 400 }
      );
    }

    // 获取分类名称用于日志
    const categoryResult = await query(
      'SELECT name FROM activity_categories WHERE id = ?',
      [id]
    );
    const categoryName = categoryResult.rows?.[0]?.name;

    // 先删除关联的产品活动关系
    await query('DELETE FROM product_activities WHERE activity_category_id = ?', [id]);

    // 记录活动日志
    await query(
      `INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        'activity_category',
        'delete',
        id,
        categoryName || 'Unknown',
        JSON.stringify({ category_id: id }),
        'system'
      ]
    );

    const deleteResult = await query('DELETE FROM activity_categories WHERE id = ?', [id]);

    if (!deleteResult.changes || deleteResult.changes === 0) {
      logMonitor('ACTIVITY_CATEGORIES', 'NOT_FOUND', { categoryId: id });
      return NextResponse.json(
        { success: false, error: 'Activity category not found' },
        { status: 404 }
      );
    }

    logMonitor('ACTIVITY_CATEGORIES', 'SUCCESS', { action: 'DELETE_ACTIVITY_CATEGORY', categoryId: id });
    
    return NextResponse.json({
      success: true,
      data: { message: 'Activity category deleted successfully' }
    });

  } catch (error: any) {
    logMonitor('ACTIVITY_CATEGORIES', 'ERROR', { action: 'DELETE_ACTIVITY_CATEGORY', error: error?.message || String(error) });
    console.error('Error deleting activity category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete activity category' },
      { status: 500 }
    );
  }
}
