import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    logMonitor('CATEGORIES', 'REQUEST', { method: 'GET', action: 'GET_CATEGORIES' });
    
    const result = await query('SELECT id, name, name_en, name_ar, slug, description, image, created_at FROM categories ORDER BY created_at DESC');
    
    logMonitor('CATEGORIES', 'SUCCESS', { action: 'GET_CATEGORIES', count: result.rows?.length || 0 });
    
    return NextResponse.json({
      success: true,
      data: result.rows || []
    });
  } catch (error: any) {
    logMonitor('CATEGORIES', 'ERROR', { action: 'GET_CATEGORIES', error: error?.message || String(error) });
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    logMonitor('CATEGORIES', 'REQUEST', { method: 'POST', action: 'CREATE_CATEGORY' });
    
    // 验证管理员权限
    const adminResult = requireAdmin(request);
    if (adminResult.response) {
      return adminResult.response;
    }

    const body = await request.json();
    const { name, slug, description, image } = body;
    
    const insertResult = await query(
      'INSERT INTO categories (name, slug, description, image) VALUES (?, ?, ?, ?)',
      [name, slug, description, image]
    );

    const newCategory = await query('SELECT * FROM categories WHERE id = ?', [insertResult.lastInsertRowid]);

    logMonitor('CATEGORIES', 'SUCCESS', { action: 'CREATE_CATEGORY', categoryId: insertResult.lastInsertRowid });
    
    return NextResponse.json({
      success: true,
      data: newCategory.rows[0]
    }, { status: 201 });
  } catch (error: any) {
    logMonitor('CATEGORIES', 'ERROR', { action: 'CREATE_CATEGORY', error: error?.message || String(error) });
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    logMonitor('CATEGORIES', 'REQUEST', { method: 'PUT', action: 'UPDATE_CATEGORY' });
    
    // 验证管理员权限
    const adminResult = requireAdmin(request);
    if (adminResult.response) {
      return adminResult.response;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    
    if (!id) {
      logMonitor('CATEGORIES', 'VALIDATION_FAILED', { error: 'Category ID is required' });
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    const { name, slug, description, image } = body;
    const updateResult = await query(
      'UPDATE categories SET name = ?, slug = ?, description = ?, image = ? WHERE id = ?',
      [name, slug, description, image, id]
    );

    if (!updateResult.changes || updateResult.changes === 0) {
      logMonitor('CATEGORIES', 'NOT_FOUND', { categoryId: id });
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    const updatedCategory = await query('SELECT * FROM categories WHERE id = ?', [id]);

    logMonitor('CATEGORIES', 'SUCCESS', { action: 'UPDATE_CATEGORY', categoryId: id });
    
    return NextResponse.json({
      success: true,
      data: updatedCategory.rows[0]
    });
  } catch (error: any) {
    logMonitor('CATEGORIES', 'ERROR', { action: 'UPDATE_CATEGORY', error: error?.message || String(error) });
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    logMonitor('CATEGORIES', 'REQUEST', { method: 'DELETE', action: 'DELETE_CATEGORY' });
    
    // 验证管理员权限
    const adminResult = requireAdmin(request);
    if (adminResult.response) {
      return adminResult.response;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      logMonitor('CATEGORIES', 'VALIDATION_FAILED', { error: 'Category ID is required' });
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    const deleteResult = await query('DELETE FROM categories WHERE id = ?', [id]);

    if (!deleteResult.changes || deleteResult.changes === 0) {
      logMonitor('CATEGORIES', 'NOT_FOUND', { categoryId: id });
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }
    
    logMonitor('CATEGORIES', 'SUCCESS', { action: 'DELETE_CATEGORY', categoryId: id });
    
    return NextResponse.json({
      success: true,
      data: { message: 'Category deleted successfully' }
    });
  } catch (error: any) {
    logMonitor('CATEGORIES', 'ERROR', { action: 'DELETE_CATEGORY', error: error?.message || String(error) });
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
