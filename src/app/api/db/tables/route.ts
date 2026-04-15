import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' 
      ORDER BY name
    `);

    const tables = (result.rows || []).map((row: any) => row.name);

    const tableInfos = await Promise.all(
      tables.map(async (table: string) => {
        try {
          const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`);
          return {
            name: table,
            count: countResult.rows?.[0]?.count || 0
          };
        } catch {
          return { name: table, count: -1 };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: tableInfos
    });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}
