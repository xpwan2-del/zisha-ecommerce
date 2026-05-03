import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { logMonitor } from '@/lib/utils/logger';

let db: SqlJsDatabase | null = null;
let SQL: SqlJsStatic | null = null;
const dbPath = path.join(process.cwd(), 'src/lib/db/database.sqlite');

let transactionSnapshot: Uint8Array | null = null;

async function initDB(): Promise<SqlJsDatabase> {
  logMonitor('DB', 'INIT', { message: '开始初始化数据库' });

  const wasmBuffer = fs.readFileSync(path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'));
  const wasmBinary = wasmBuffer.buffer.slice(wasmBuffer.byteOffset, wasmBuffer.byteOffset + wasmBuffer.byteLength);
  SQL = await initSqlJs({ wasmBinary });

  try {
    const buffer = fs.readFileSync(dbPath);
    logMonitor('DB', 'INIT', {
      message: '从磁盘读取数据库文件',
      size: buffer.length,
      path: dbPath
    });

    const tempDb = new SQL.Database(new Uint8Array(buffer));
    const checkResult = tempDb.exec("SELECT product_id, quantity FROM inventory WHERE product_id = 1");
    if (checkResult.length > 0) {
      const stock = checkResult[0].values[0][1];
      logMonitor('DB', 'INIT', { message: '磁盘中商品1库存', stock });
    }
    tempDb.close();

    db = new SQL.Database(new Uint8Array(buffer));
    db.run("PRAGMA foreign_keys = ON");
    logMonitor('DB', 'INIT', { message: '数据库初始化完成，外键约束已启用' });
  } catch (error) {
    logMonitor('DB', 'ERROR', { message: '创建新数据库（文件不存在或损坏）', error: String(error) });
    db = new SQL.Database();
    db.run("PRAGMA foreign_keys = ON");
  }
  return db;
}

export async function getDB(): Promise<SqlJsDatabase> {
  if (!db) {
    logMonitor('DB', 'GET', { message: '数据库为空，调用initDB()' });
    db = await initDB();
  }
  return db;
}

function saveToDisk(data: Uint8Array) {
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function restoreFromSnapshot(database: SqlJsDatabase, snapshot: Uint8Array) {
  const data = database.export();
  const beforeSize = data.length;
  const snapshotSize = snapshot.length;

  logMonitor('DB', 'ROLLBACK', {
    message: '回滚事务，恢复数据库快照',
    dbSizeBeforeRollback: beforeSize,
    snapshotSize
  });

  database.close();

  if (!SQL) {
    throw new Error('SQL module not initialized, cannot restore from snapshot');
  }

  db = new SQL.Database(snapshot);
  saveToDisk(snapshot);

  logMonitor('DB', 'ROLLBACK_COMPLETE', {
    message: '数据库已从快照恢复',
    dbSizeAfterRestore: snapshotSize
  });
}

export async function query(sql: string, params: any[] = []) {
  const database = await getDB();
  const sqlUpper = sql.trim().toUpperCase();

  if (sqlUpper === 'BEGIN' || sqlUpper.startsWith('BEGIN ')) {
    transactionSnapshot = database.export();
    logMonitor('DB', 'TRANSACTION', {
      message: '事务开始，已保存数据库快照',
      snapshotSize: transactionSnapshot.length
    });
    return { rows: [], changes: 0, lastInsertRowid: null };
  }

  if (sqlUpper === 'COMMIT') {
    const data = database.export();
    saveToDisk(data);
    transactionSnapshot = null;
    logMonitor('DB', 'TRANSACTION', {
      message: '事务提交，已保存到磁盘',
      dbSize: data.length
    });
    return { rows: [], changes: 0, lastInsertRowid: null };
  }

  if (sqlUpper === 'ROLLBACK' || sqlUpper === 'END') {
    if (transactionSnapshot) {
      restoreFromSnapshot(database, transactionSnapshot);
      transactionSnapshot = null;
    } else {
      logMonitor('DB', 'TRANSACTION', {
        message: 'ROLLBACK 被调用但没有活跃的事务快照，忽略'
      });
    }
    return { rows: [], changes: 0, lastInsertRowid: null };
  }

  const isWriteOperation = sqlUpper.startsWith('UPDATE') ||
                           sqlUpper.startsWith('DELETE') ||
                           sqlUpper.startsWith('INSERT');

  const startTime = performance.now();

  try {
    if (isWriteOperation) {
      const beforeResult = database.exec("SELECT quantity FROM inventory WHERE product_id = 1");
      const beforeStock = beforeResult.length > 0 ? beforeResult[0].values[0][0] : 'N/A';

      logMonitor('DB', 'WRITE_START', {
        sql: sql.substring(0, 100),
        params,
        beforeStock,
        operation: sqlUpper.startsWith('INSERT') ? 'INSERT' :
                  sqlUpper.startsWith('UPDATE') ? 'UPDATE' : 'DELETE'
      });

      database.run(sql, params);
      const changes = database.getRowsModified();

      let lastInsertRowid = null;
      if (sqlUpper.startsWith('INSERT')) {
        const lastIdResult = database.exec("SELECT last_insert_rowid()");
        if (lastIdResult.length > 0 && lastIdResult[0].values.length > 0) {
          lastInsertRowid = lastIdResult[0].values[0][0];
        }
      }

      const afterResult = database.exec("SELECT quantity FROM inventory WHERE product_id = 1");
      const afterStock = afterResult.length > 0 ? afterResult[0].values[0][0] : 'N/A';

      if (!transactionSnapshot) {
        const data = database.export();
        saveToDisk(data);

        const endTime = performance.now();
        logMonitor('DB', 'WRITE_COMPLETE', {
          changes,
          lastInsertRowid,
          afterStock,
          duration: `${(endTime - startTime).toFixed(2)}ms`,
          diskSize: data.length
        });
      } else {
        const endTime = performance.now();
        logMonitor('DB', 'WRITE_COMPLETE', {
          changes,
          lastInsertRowid,
          afterStock,
          duration: `${(endTime - startTime).toFixed(2)}ms`,
          inTransaction: true
        });
      }

      return { rows: [], changes, lastInsertRowid };
    } else {
      const beforeResult = database.exec("SELECT quantity FROM inventory WHERE product_id = 1");
      const beforeStock = beforeResult.length > 0 ? beforeResult[0].values[0][0] : 'N/A';

      logMonitor('DB', 'READ_START', {
        sql: sql.substring(0, 100),
        params,
        beforeStock
      });

      const result = database.exec(sql, params);
      const endTime = performance.now();

      if (result.length === 0) {
        logMonitor('DB', 'READ_COMPLETE', {
          rowCount: 0,
          duration: `${(endTime - startTime).toFixed(2)}ms`
        });
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

      logMonitor('DB', 'READ_COMPLETE', {
        rowCount: rows.length,
        columns,
        duration: `${(endTime - startTime).toFixed(2)}ms`
      });

      return { rows };
    }
  } catch (error) {
    const endTime = performance.now();

    logMonitor('DB', 'ERROR', {
      sql: sql.substring(0, 100),
      params,
      error: String(error),
      duration: `${(endTime - startTime).toFixed(2)}ms`
    });

    throw error;
  }
}

export async function closeDB() {
  if (db) {
    logMonitor('DB', 'CLOSE', { message: '关闭数据库' });
    db.close();
  }
}
