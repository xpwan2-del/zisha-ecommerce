import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import {
  isDatabaseTableMutable,
  isDatabaseTableReadable,
  isSafeColumnName,
  DATABASE_MUTATION_BLOCKLIST,
  DATABASE_READONLY_TABLES
} from '@/lib/admin-database-access';

function normalizeLimit(value: string | null) {
  const limit = Number.parseInt(value || '20', 10);
  if (!Number.isFinite(limit)) return 20;
  return Math.min(Math.max(limit, 1), 100);
}

function normalizePage(value: string | null) {
  const page = Number.parseInt(value || '1', 10);
  if (!Number.isFinite(page)) return 1;
  return Math.max(page, 1);
}

function sanitizeRowData(data: Record<string, unknown>) {
  const entries = Object.entries(data).filter(([key]) => key !== 'id' && isSafeColumnName(key));
  return Object.fromEntries(entries);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { table } = await params;
    if (!isDatabaseTableReadable(table)) {
      return NextResponse.json({ success: false, error: 'DATABASE_TABLE_NOT_ALLOWED' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = normalizePage(searchParams.get('page'));
    const limit = normalizeLimit(searchParams.get('limit'));
    const offset = (page - 1) * limit;

    const columnsResult = await query(`PRAGMA table_info(${table})`);
    const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`);
    const rowsResult = await query(`SELECT * FROM ${table} LIMIT ? OFFSET ?`, [limit, offset]);

    return NextResponse.json({
      success: true,
      data: {
        columns: columnsResult.rows || [],
        rows: rowsResult.rows || [],
        total: Number(countResult.rows?.[0]?.count || 0),
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Failed to fetch database table:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch database table' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const { table } = await params;
    if (!isDatabaseTableMutable(table)) {
      return NextResponse.json({ success: false, error: 'DATABASE_TABLE_MUTATION_BLOCKED' }, { status: 403 });
    }

    const data = sanitizeRowData(await request.json());
    const columns = Object.keys(data);
    if (columns.length === 0) {
      return NextResponse.json({ success: false, error: 'EMPTY_ROW_DATA' }, { status: 400 });
    }

    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((column) => data[column]);
    const result = await query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    await recordAdminAuditLog({
      request,
      module: 'DATABASE',
      action: 'CREATE_ROW',
      description: `管理员新增数据库表记录: ${table}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: Number(result.lastInsertRowid || 0),
      resourceType: table,
      riskLevel: 'critical',
      metadata: { table, columns, readableTables: DATABASE_READONLY_TABLES.size, mutationBlocklist: DATABASE_MUTATION_BLOCKLIST.size }
    });

    return NextResponse.json({ success: true, data: { id: result.lastInsertRowid } }, { status: 201 });
  } catch (error) {
    console.error('Failed to create database row:', error);
    return NextResponse.json({ success: false, error: 'Failed to create database row' }, { status: 500 });
  }
}
