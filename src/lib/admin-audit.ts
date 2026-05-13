import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export interface AuditLogInput {
  request: NextRequest;
  module: string;
  action: string;
  description?: string;
  operator?: string;
  status?: 'success' | 'failed';
  errorMessage?: string;
  resourceId?: string | number;
  resourceType?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

export async function ensureAuditLogsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module VARCHAR(50),
      action VARCHAR(100) NOT NULL,
      description TEXT,
      operator VARCHAR(100) NOT NULL,
      ip_address VARCHAR(50),
      user_agent TEXT,
      status VARCHAR(20) DEFAULT 'success',
      error_message TEXT,
      risk_level VARCHAR(20) DEFAULT 'medium',
      resource_id VARCHAR(100),
      resource_type VARCHAR(50),
      metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const columns = ['risk_level', 'resource_id', 'resource_type', 'metadata'];
  for (const col of columns) {
    try {
      await query(`ALTER TABLE audit_logs ADD COLUMN ${col} TEXT`);
    } catch (e) {
    }
  }
}

function sanitizeAuditPayload(data: any): string {
  if (!data) return '';
  const sensitiveKeys = [/password/i, /token/i, /secret/i, /key/i, /auth/i, /cookie/i, /session/i];
  
  const sanitize = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    
    const newObj: any = {};
    for (const key in obj) {
      if (sensitiveKeys.some(re => re.test(key))) {
        newObj[key] = '******';
      } else {
        newObj[key] = sanitize(obj[key]);
      }
    }
    return newObj;
  };
  
  try {
    return JSON.stringify(sanitize(data));
  } catch (e) {
    return '[Circular or Unserializable Data]';
  }
}

export async function recordAdminAuditLog(input: AuditLogInput) {
  try {
    await ensureAuditLogsTable();

    const ip = input.request.headers.get('x-forwarded-for') || 
               input.request.headers.get('x-real-ip') || 
               'unknown';
    const ua = input.request.headers.get('user-agent') || 'unknown';
    
    await query(
      `INSERT INTO audit_logs (
        module, action, description, operator, 
        ip_address, user_agent, status, error_message,
        risk_level, resource_id, resource_type, metadata,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        input.module,
        input.action,
        input.description || null,
        input.operator || 'SYSTEM',
        ip,
        ua,
        input.status || 'success',
        input.errorMessage || null,
        input.riskLevel || 'medium',
        input.resourceId ? String(input.resourceId) : null,
        input.resourceType || null,
        sanitizeAuditPayload(input.metadata),
      ]
    );
  } catch (error) {
    console.error('[AuditLog] Failed to record audit log:', error);
  }
}
