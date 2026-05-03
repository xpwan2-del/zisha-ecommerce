import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
/**
 * @api {GET} /api/db/table/:table 查询表数据
 * @apiName GetTableData
 * @apiGroup DB_DEBUG
 * @apiDescription 查询指定表的数据，支持分页（调试工具）。
 */


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!table || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return NextResponse.json(
        { success: false, error: 'Invalid table name' },
        { status: 400 }
      );
    }

    const columnsResult = await query(`PRAGMA table_info(${table})`);
    const columns = columnsResult.rows || [];

    const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`);
    const total = countResult.rows?.[0]?.count || 0;

    const dataResult = await query(
      `SELECT * FROM ${table} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: {
        rows: dataResult.rows || [],
        columns: columns,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch table data' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const body = await request.json();

    if (!table || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return NextResponse.json(
        { success: false, error: 'Invalid table name' },
        { status: 400 }
      );
    }

    const columnsResult = await query(`PRAGMA table_info(${table})`);
    const columns = (columnsResult.rows || []).filter((col: any) => col.name !== 'id');

    const columnNames = columns.map((col: any) => col.name);
    const values = columns.map((col: any) => body[col.name]);

    const placeholders = columnNames.map(() => '?').join(', ');
    const result = await query(
      `INSERT INTO ${table} (${columnNames.join(', ')}) VALUES (${placeholders})`,
      values
    );

    return NextResponse.json({
      success: true,
      data: { id: result.lastInsertRowid }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create record' },
      { status: 500 }
    );
  }
}
