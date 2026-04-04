import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const mockCategories = [
  { id: 1, name: "茶壶", name_en: "Teapots", name_ar: "أبوات الشاي", description: "Yixing Zisha Teapots" },
  { id: 2, name: "茶杯", name_en: "Cups", name_ar: "أكواب الشاي", description: "Zisha Tea Cups" },
  { id: 3, name: "配件", name_en: "Accessories", name_ar: "الإكسسوارات", description: "Tea Accessories" },
  { id: 4, name: "套组", name_en: "Sets", name_ar: "المجموعات", description: "Tea Sets" }
];

export async function GET(request: NextRequest) {
  try {
    const result = await query('SELECT id, name, name_en, name_ar, slug, description, image, created_at FROM categories ORDER BY created_at DESC');
    if (result.rows && result.rows.length > 0) {
      return NextResponse.json(result.rows);
    }
    return NextResponse.json(mockCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(mockCategories);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, description, image } = body;
    
    const result = await query(
      'INSERT INTO categories (name, slug, description, image) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, slug, description, image]
    );
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }
    
    const { name, slug, description, image } = body;
    const result = await query(
      'UPDATE categories SET name = $1, slug = $2, description = $3, image = $4 WHERE id = $5 RETURNING *',
      [name, slug, description, image, id]
    );
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }
    
    const result = await query('DELETE FROM categories WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}