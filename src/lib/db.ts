import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

let db: SqlJsDatabase | null = null;
const dbPath = path.join(process.cwd(), 'src/lib/db/database.sqlite');
const wasmPath = path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');

async function initDB(): Promise<SqlJsDatabase> {
  const wasmBinary = fs.readFileSync(wasmPath);
  const SQL = await initSqlJs({
    wasmBinary
  });
  try {
    const buffer = fs.readFileSync(dbPath);
    return new SQL.Database(new Uint8Array(buffer));
  } catch {
    return new SQL.Database();
  }
}

export async function getDB(): Promise<SqlJsDatabase> {
  if (!db) {
    db = await initDB();
  }
  return db;
}

export async function query(sql: string, params: any[] = []) {
  const database = await getDB();
  const sqlUpper = sql.trim().toUpperCase();
  const isWriteOperation = sqlUpper.startsWith('UPDATE') ||
                           sqlUpper.startsWith('DELETE') ||
                           sqlUpper.startsWith('INSERT');

  try {
    if (isWriteOperation) {
      database.run(sql, params);
      const changes = database.getRowsModified();
      const lastIdResult = database.exec("SELECT last_insert_rowid() as id");
      const lastInsertRowid = lastIdResult.length > 0 ? lastIdResult[0].values[0][0] : 0;
      return { rows: [], changes, lastInsertRowid };
    } else {
      const result = database.exec(sql, params);
      if (result.length === 0) {
        return { rows: [] };
      }
      const columns = result[0].columns;
      const rows = result[0].values.map(row => {
        const obj: any = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      });
      return { rows };
    }
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

export async function closeDB() {
  if (db) {
    db.close();
    db = null;
  }
}
