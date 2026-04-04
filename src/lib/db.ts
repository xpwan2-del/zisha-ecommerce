import { createClient } from '@libsql/client';

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!client) {
    const isVercel = process.env.VERCEL === '1';

    if (isVercel) {
      const dbUrl = process.env.TURSO_DATABASE_URL;
      const authToken = process.env.TURSO_AUTH_TOKEN;

      if (dbUrl && authToken) {
        client = createClient({
          url: dbUrl,
          authToken: authToken,
        });
      }
    } else {
      client = createClient({
        url: 'file:./zisha-ecommerce.db',
      });
    }
  }
  return client;
}

export async function query(sql: string, params?: any[]) {
  const db = getClient();

  if (!db) {
    console.error('数据库未初始化');
    return { rows: [], rowCount: 0 };
  }

  try {
    const isWrite = sql.trim().toUpperCase().startsWith('INSERT') ||
                    sql.trim().toUpperCase().startsWith('UPDATE') ||
                    sql.trim().toUpperCase().startsWith('DELETE') ||
                    sql.trim().toUpperCase().startsWith('CREATE');

    const result = await db.execute({
      sql,
      args: params || [],
      sync: true,
    });

    return {
      rows: result.rows || [],
      rowCount: result.rows?.length || 0,
    };
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
}

export async function getDb() {
  return getClient();
}

export { getClient };
