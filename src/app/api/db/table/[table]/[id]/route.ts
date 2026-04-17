import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

function calculateStatusId(quantity: number): number {
  if (quantity <= 0) return 4;
  if (quantity <= 5) return 3;
  if (quantity <= 10) return 2;
  return 1;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  try {
    const { table, id } = await params;
    const body = await request.json();

    console.log(`[DB UPDATE] table=${table}, id=${id}`);
    console.log(`[DB UPDATE] body:`, JSON.stringify(body));

    if (!table || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return NextResponse.json(
        { success: false, error: 'Invalid table name' },
        { status: 400 }
      );
    }

    const columnsResult = await query(`PRAGMA table_info(${table})`);
    const columns = (columnsResult.rows || []).filter((col: any) => col.name !== 'id');

    console.log(`[DB UPDATE] columns:`, columns.map((c: any) => c.name));

    let updates = columns.map((col: any) => `${col.name} = ?`).join(', ');
    let values = columns.map((col: any) => body[col.name]);

    // 如果是 inventory 表且 quantity 被修改了，自动更新 status_id
    if (table === 'inventory' && body.quantity !== undefined) {
      const newStatusId = calculateStatusId(body.quantity);
      updates = `${updates}, status_id = ?`;
      values = [...values, newStatusId];
      console.log(`[DB UPDATE] 自动计算新 status_id: ${newStatusId}`);
    }

    console.log(`[DB UPDATE] SQL: UPDATE ${table} SET ${updates} WHERE id = ?`);
    console.log(`[DB UPDATE] values:`, values);

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
