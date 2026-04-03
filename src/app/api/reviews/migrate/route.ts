import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST() {
  try {
    const tableInfo = await query('PRAGMA table_info(reviews)');
    const columns = tableInfo.rows.map((row: any) => row.name);

    const migrations = [];

    if (!columns.includes('comment_en')) {
      migrations.push(
        query('ALTER TABLE reviews ADD COLUMN comment_en TEXT')
      );
    }

    if (!columns.includes('comment_ar')) {
      migrations.push(
        query('ALTER TABLE reviews ADD COLUMN comment_ar TEXT')
      );
    }

    await Promise.all(migrations);

    return NextResponse.json({ 
      message: 'Reviews table migrated successfully',
      addedColumns: migrations.length > 0 ? ['comment_en', 'comment_ar'] : []
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error 
    }, { status: 500 });
  }
}
