// @reuses: 所有数据库操作统一通过 logger.ts 管理
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { logMonitor } from '@/lib/utils/logger';  // @reuses: 复用 logger.ts 的统一日志

// ============================================================
// 数据库实例管理
// ============================================================
let db: SqlJsDatabase | null = null;
const dbPath = path.join(process.cwd(), 'src/lib/db/database.sqlite');

// ============================================================
// 数据库初始化
// ============================================================
/**
 * initDB - 初始化SQL.js数据库
 * @description 加载SQL.js WASM模块，读取或创建SQLite数据库文件
 * @returns Promise<SqlJsDatabase> 数据库实例
 * @reuses: logMonitor - 使用统一日志记录初始化过程
 */
async function initDB(): Promise<SqlJsDatabase> {
  // @reuses: logMonitor('DB', 'INIT', { message: '开始初始化数据库' })
  logMonitor('DB', 'INIT', { message: '开始初始化数据库' });

  // 加载SQL.js WASM模块
  const wasmBuffer = fs.readFileSync(path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'));
  const wasmBinary = wasmBuffer.buffer.slice(wasmBuffer.byteOffset, wasmBuffer.byteOffset + wasmBuffer.byteLength);
  const SQL = await initSqlJs({ wasmBinary });

  try {
    // 尝试读取现有数据库文件
    const buffer = fs.readFileSync(dbPath);
    // @reuses: logMonitor - 记录数据库文件读取
    logMonitor('DB', 'INIT', {
      message: '从磁盘读取数据库文件',
      size: buffer.length,
      path: dbPath
    });

    // 创建临时数据库检查商品1库存
    const tempDb = new SQL.Database(new Uint8Array(buffer));
    const checkResult = tempDb.exec("SELECT product_id, quantity FROM inventory WHERE product_id = 1");
    if (checkResult.length > 0) {
      const stock = checkResult[0].values[0][1];
      // @reuses: logMonitor - 记录库存检查结果
      logMonitor('DB', 'INIT', { message: '磁盘中商品1库存', stock });
    }
    tempDb.close();

    db = new SQL.Database(new Uint8Array(buffer));
    // @reuses: logMonitor - 记录初始化完成
    logMonitor('DB', 'INIT', { message: '数据库初始化完成' });
  } catch (error) {
    // @reuses: logMonitor - 记录错误
    logMonitor('DB', 'ERROR', { message: '创建新数据库（文件不存在或损坏）', error: String(error) });
    db = new SQL.Database();
  }
  return db;
}

// ============================================================
// 获取数据库实例
// ============================================================
/**
 * getDB - 获取数据库实例
 * @description 单例模式获取数据库实例，如果不存在则初始化
 * @returns Promise<SqlJsDatabase> 数据库实例
 * @reuses: logMonitor - 记录获取数据库实例的过程
 */
export async function getDB(): Promise<SqlJsDatabase> {
  if (!db) {
    // @reuses: logMonitor - 记录初始化调用
    logMonitor('DB', 'GET', { message: '数据库为空，调用initDB()' });
    db = await initDB();
  }
  return db;
}

// ============================================================
// 执行SQL查询
// ============================================================
/**
 * query - 执行SQL查询
 * @description 统一的数据查询入口，支持读和写操作，自动记录日志
 * @param sql - SQL语句字符串
 * @param params - SQL参数数组
 * @returns Promise<{rows?: any[], changes?: number, lastInsertRowid?: any}>
 * @reuses:
 *   - logMonitor('DB', 'QUERY_START') - 记录查询开始
 *   - logMonitor('DB', 'QUERY_COMPLETE') - 记录查询完成
 *   - logMonitor('DB', 'WRITE_START') - 记录写入开始
 *   - logMonitor('DB', 'WRITE_COMPLETE') - 记录写入完成
 *   - logMonitor('DB', 'ERROR') - 记录错误
 */
export async function query(sql: string, params: any[] = []) {
  const database = await getDB();
  const sqlUpper = sql.trim().toUpperCase();

  // 检测事务控制语句 - sql.js 不需要显式事务控制，每次写入都会自动保存
  if (sqlUpper === 'BEGIN' || sqlUpper.startsWith('BEGIN ') ||
      sqlUpper === 'COMMIT' || sqlUpper === 'ROLLBACK' || sqlUpper === 'END') {
    // sql.js 内存数据库自动保存，跳过事务控制语句
    return { rows: [], changes: 0, lastInsertRowid: null };
  }

  // 判断操作类型
  const isWriteOperation = sqlUpper.startsWith('UPDATE') ||
                           sqlUpper.startsWith('DELETE') ||
                           sqlUpper.startsWith('INSERT');

  // 获取高精度计时器
  const startTime = performance.now();

  try {
    if (isWriteOperation) {
      // ==================== 写入操作 ====================
      // @reuses: logMonitor - 记录写入前库存状态
      const beforeResult = database.exec("SELECT quantity FROM inventory WHERE product_id = 1");
      const beforeStock = beforeResult.length > 0 ? beforeResult[0].values[0][0] : 'N/A';

      // 记录写入开始
      logMonitor('DB', 'WRITE_START', {
        sql: sql.substring(0, 100),  // 截断太长的SQL
        params,
        beforeStock,
        operation: sqlUpper.startsWith('INSERT') ? 'INSERT' :
                  sqlUpper.startsWith('UPDATE') ? 'UPDATE' : 'DELETE'
      });

      // 执行写入
      database.run(sql, params);
      const changes = database.getRowsModified();

      // 获取INSERT后的自增ID
      let lastInsertRowid = null;
      if (sqlUpper.startsWith('INSERT')) {
        const lastIdResult = database.exec("SELECT last_insert_rowid()");
        if (lastIdResult.length > 0 && lastIdResult[0].values.length > 0) {
          lastInsertRowid = lastIdResult[0].values[0][0];
        }
      }

      // 记录写入后库存状态
      const afterResult = database.exec("SELECT quantity FROM inventory WHERE product_id = 1");
      const afterStock = afterResult.length > 0 ? afterResult[0].values[0][0] : 'N/A';

      // 导出数据库到磁盘
      const data = database.export();
      const buffer = Buffer.from(data);

      // 写入磁盘
      fs.writeFileSync(dbPath, buffer);

      // 计算耗时
      const endTime = performance.now();

      // @reuses: logMonitor - 记录写入完成
      logMonitor('DB', 'WRITE_COMPLETE', {
        changes,
        lastInsertRowid,
        afterStock,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        diskSize: buffer.length
      });

      return { rows: [], changes, lastInsertRowid };
    } else {
      // ==================== 读取操作 ====================
      // @reuses: logMonitor - 记录读取前库存状态
      const beforeResult = database.exec("SELECT quantity FROM inventory WHERE product_id = 1");
      const beforeStock = beforeResult.length > 0 ? beforeResult[0].values[0][0] : 'N/A';

      // 记录读取开始
      logMonitor('DB', 'READ_START', {
        sql: sql.substring(0, 100),
        params,
        beforeStock
      });

      // 执行读取
      const result = database.exec(sql, params);

      // 计算耗时
      const endTime = performance.now();

      // 处理结果
      if (result.length === 0) {
        // @reuses: logMonitor - 记录读取完成（无结果）
        logMonitor('DB', 'READ_COMPLETE', {
          rowCount: 0,
          duration: `${(endTime - startTime).toFixed(2)}ms`
        });
        return { rows: [] };
      }

      // 转换结果为对象数组
      const columns = result[0].columns;
      const rows = result[0].values.map(row => {
        const obj: any = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      });

      // @reuses: logMonitor - 记录读取完成
      logMonitor('DB', 'READ_COMPLETE', {
        rowCount: rows.length,
        columns,
        duration: `${(endTime - startTime).toFixed(2)}ms`
      });

      return { rows };
    }
  } catch (error) {
    // 计算耗时
    const endTime = performance.now();

    // @reuses: logMonitor - 记录错误
    logMonitor('DB', 'ERROR', {
      sql: sql.substring(0, 100),
      params,
      error: String(error),
      duration: `${(endTime - startTime).toFixed(2)}ms`
    });

    throw error;
  }
}

// ============================================================
// 关闭数据库
// ============================================================
/**
 * closeDB - 关闭数据库连接
 * @description 关闭当前数据库连接并记录日志
 * @reuses: logMonitor - 记录关闭操作
 */
export async function closeDB() {
  if (db) {
    // @reuses: logMonitor - 记录关闭操作
    logMonitor('DB', 'CLOSE', { message: '关闭数据库' });
    db.close();
  }
}
