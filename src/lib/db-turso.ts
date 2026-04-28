import { createDb } from "@tursodatabase/vercel-experimental";

type TursoDatabase = Awaited<ReturnType<typeof createDb>>;

let db: TursoDatabase | null = null;

export async function getTursoDB(): Promise<TursoDatabase> {
  if (!db) {
    const dbName = process.env.TURSO_DATABASE;
    if (!dbName) {
      throw new Error('TURSO_DATABASE environment variable is not set');
    }
    db = await createDb(dbName);
  }
  return db;
}

export async function tursoQuery(sql: string, params: any[] = []) {
  const database = await getTursoDB();

  try {
    const sqlUpper = sql.trim().toUpperCase();
    const isWriteOperation = sqlUpper.startsWith('UPDATE') ||
                             sqlUpper.startsWith('DELETE') ||
                             sqlUpper.startsWith('INSERT');

    if (isWriteOperation) {
      await database.execute(sql, params);
      return {
        rows: [],
        changes: 1,
        lastInsertRowid: 0
      };
    } else {
      const result = await database.query(sql, params);
      return { rows: result.rows || [] };
    }
  } catch (error) {
    console.error('Turso query error:', error);
    throw error;
  }
}

export async function closeTursoDB() {
  if (db) {
    await db.close();
    db = null;
  }
}
