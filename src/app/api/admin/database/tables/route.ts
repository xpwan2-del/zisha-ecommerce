import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth } from '@/lib/admin-helpers';
import {
  isDatabaseTableReadable,
  DATABASE_MUTATION_BLOCKLIST,
  DATABASE_READONLY_TABLES
} from '@/lib/admin-database-access';

export async function GET(request: NextRequest) {
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    const tablesResult = await query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );

    const tables = [];
    for (const row of tablesResult.rows || []) {
      const tableName = String(row.name || '');
      if (!isDatabaseTableReadable(tableName)) continue;
      const countResult = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
      tables.push({
        name: tableName,
        count: Number(countResult.rows?.[0]?.count || 0),
        mutable: !DATABASE_MUTATION_BLOCKLIST.has(tableName)
      });
    }

    return NextResponse.json({
      success: true,
      data: tables,
      meta: {
        readableTables: DATABASE_READONLY_TABLES.size,
        mutationBlocklist: DATABASE_MUTATION_BLOCKLIST.size
      }
    });
  } catch (error) {
    console.error('Failed to fetch database tables:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch database tables' }, { status: 500 });
  }
}
