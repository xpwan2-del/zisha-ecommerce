import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  try {
    const { table, id } = await params;
    const body = await request.json();

    if (!table || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return NextResponse.json(
        { success: false, error: 'Invalid table name' },
        { status: 400 }
      );
    }

    const columnsResult = await query(`PRAGMA table_info(${table})`);
    const columns = (columnsResult.rows || []).filter((col: any) => col.name !== 'id');

    const updates = columns.map((col: any) => `${col.name} = ?`).join(', ');
    const values = columns.map((col: any) => body[col.name]);

    await query(
      `UPDATE ${table} SET ${updates} WHERE id = ?`,
      [...values, id]
    );

    return NextResponse.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update record' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  try {
    const { table, id } = await params;

    if (!table || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return NextResponse.json(
        { success: false, error: 'Invalid table name' },
        { status: 400 }
      );
    }

    await query(`DELETE FROM ${table} WHERE id = ?`, [id]);

    return NextResponse.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete record' },
      { status: 500 }
    );
  }
}
