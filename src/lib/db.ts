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
  const result = await database.all(sql, params);
  return { rows: result };
}
