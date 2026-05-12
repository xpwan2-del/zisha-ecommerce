import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import {
  isDatabaseTableMutable,
  isSafeColumnName,
  DATABASE_MUTATION_BLOCKLIST,
  DATABASE_READONLY_TABLES
} from '@/lib/admin-database-access';

function sanitizeRowData(data: Record<string, unknown>) {
  const entries = Object.entries(data).filter(([key]) => key !== 'id' && isSafeColumnName(key));
  return Object.fromEntries(entries);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { table, id } = await params;
    const rowId = Number.parseInt(id, 10);
    if (!isDatabaseTableMutable(table) || !Number.isInteger(rowId) || rowId <= 0) {
      return NextResponse.json({ success: false, error: 'DATABASE_TABLE_MUTATION_BLOCKED' }, { status: 403 });
    }

    const data = sanitizeRowData(await request.json());
    const columns = Object.keys(data);
    if (columns.length === 0) {
      return NextResponse.json({ success: false, error: 'EMPTY_ROW_DATA' }, { status: 400 });
    }

    const assignments = columns.map((column) => `${column} = ?`).join(', ');
    const values = columns.map((column) => data[column]);
    const result = await query(`UPDATE ${table} SET ${assignments} WHERE id = ?`, [...values, rowId]);

    if (!result.changes) {
      return NextResponse.json({ success: false, error: 'ROW_NOT_FOUND' }, { status: 404 });
    }

    await recordAdminAuditLog({
      request,
      module: 'DATABASE',
      action: 'UPDATE_ROW',
      description: `管理员更新数据库表记录: ${table}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: rowId,
      resourceType: table,
      riskLevel: 'critical',
      metadata: { table, columns, readableTables: DATABASE_READONLY_TABLES.size, mutationBlocklist: DATABASE_MUTATION_BLOCKLIST.size }
    });

    return NextResponse.json({ success: true, data: { id: rowId } });
  } catch (error) {
    console.error('Failed to update database row:', error);
    return NextResponse.json({ success: false, error: 'Failed to update database row' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { table, id } = await params;
    const rowId = Number.parseInt(id, 10);
    if (!isDatabaseTableMutable(table) || !Number.isInteger(rowId) || rowId <= 0) {
      return NextResponse.json({ success: false, error: 'DATABASE_TABLE_MUTATION_BLOCKED' }, { status: 403 });
    }

    const result = await query(`DELETE FROM ${table} WHERE id = ?`, [rowId]);
    if (!result.changes) {
      return NextResponse.json({ success: false, error: 'ROW_NOT_FOUND' }, { status: 404 });
    }

    await recordAdminAuditLog({
      request,
      module: 'DATABASE',
      action: 'DELETE_ROW',
      description: `管理员删除数据库表记录: ${table}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: rowId,
      resourceType: table,
      riskLevel: 'critical',
      metadata: { table, readableTables: DATABASE_READONLY_TABLES.size, mutationBlocklist: DATABASE_MUTATION_BLOCKLIST.size }
    });

    return NextResponse.json({ success: true, data: { id: rowId } });
  } catch (error) {
    console.error('Failed to delete database row:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete database row' }, { status: 500 });
  }
}
