import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database | null = null;

async function getDb() {
  if (!db) {
    db = await open({
      filename: './zisha-ecommerce.db',
      driver: sqlite3.Database
    });
  }
  return db;
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const database = await getDb();
  const res = await database.all(text, params || []);
  const duration = Date.now() - start;
  console.log('executed query', {
    text,
    duration,
    rows: res.length
  });
  return { rows: res, rowCount: res.length };
}

export { getDb };