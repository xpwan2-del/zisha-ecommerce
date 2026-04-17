import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database | null = null;

// Open database connection
export async function getDB() {
  if (!db) {
    db = await open({
      filename: './src/lib/db/database.sqlite',
      driver: sqlite3.Database
    });
  }
  return db;
}

// Execute a query
export async function query(sql: string, params: any[] = []) {
  const database = await getDB();
  const sqlUpper = sql.trim().toUpperCase();
  const isWriteOperation = sqlUpper.startsWith('UPDATE') ||
                           sqlUpper.startsWith('DELETE') ||
                           sqlUpper.startsWith('INSERT');
  const hasReturning = sqlUpper.includes('RETURNING');

  if (isWriteOperation && !hasReturning) {
    const result = await database.run(sql, params) as any;
    return { rows: [], changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  } else if (isWriteOperation && hasReturning) {
    // For INSERT/UPDATE/DELETE with RETURNING clause, use all() to get returned data
    const result = await database.all(sql, params);
    return { rows: result, changes: result.length };
  } else {
    const result = await database.all(sql, params);
    return { rows: result };
  }
}
