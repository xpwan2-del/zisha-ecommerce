import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkAdminAuth, createErrorResponse, logApiRequest, logApiSuccess, logApiError } from '@/lib/admin-helpers';
import { recordAdminAuditLog } from '@/lib/admin-audit';

async function ensureTable() {
  await query(`CREATE TABLE IF NOT EXISTS theme_color_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    theme_key VARCHAR(50) NOT NULL,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(theme_key, config_key)
  )`);
}

async function ensureDefaultData() {
  const count = await query("SELECT COUNT(*) as count FROM theme_color_configs");
  if (count.rows[0].count > 0) return;

  const defaults: Record<string, Record<string, string>> = {
    chinese: {
      primary: '#8B0000', secondary: '#FFD700', accent: '#FF4500',
      dark: '#1A1A2E', light: '#FAF0E6', background: '#FFFAF0',
      backgroundAlt: '#FFF5EE', text: '#333333', textMuted: '#666666',
      border: '#E8D5B7', card: '#FFFFFF',
    },
    middleEastern: {
      primary: '#1A5D1A', secondary: '#D4AF37', accent: '#1E90FF',
      dark: '#1A1A2E', light: '#F5F5DC', background: '#FFFAF0',
      backgroundAlt: '#FFF8E7', text: '#333333', textMuted: '#666666',
      border: '#D4AF37', card: '#FFFFFF',
    },
    amazon: {
      primary: '#FF9900', secondary: '#232F3E', accent: '#146EB4',
      dark: '#131A22', light: '#F3F3F3', background: '#EAEDED',
      backgroundAlt: '#F8F8F8', text: '#333333', textMuted: '#666666',
      border: '#D5D9D9', card: '#FFFFFF',
    },
    middleEasternLuxury: {
      primary: '#DAA520', secondary: '#2F4F4F', accent: '#8B0000',
      dark: '#1A1A2E', light: '#FFFAF0', background: '#FFFAF0',
      backgroundAlt: '#FFF5EE', text: '#333333', textMuted: '#666666',
      border: '#DAA520', card: '#FFFFFF',
    },
  };

  for (const [theme, configs] of Object.entries(defaults)) {
    for (const [key, value] of Object.entries(configs)) {
      await query(
        "INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES (?, ?, ?)",
        [theme, key, value]
      );
    }
  }
}

export async function GET(request: NextRequest) {
  logApiRequest('SETTINGS', 'GET', '/api/admin/settings/theme-colors');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    await ensureTable();
    await ensureDefaultData();

    const result = await query("SELECT theme_key, config_key, config_value FROM theme_color_configs");

    const colors: Record<string, Record<string, string>> = {};
    result.rows.forEach((row: any) => {
      if (!colors[row.theme_key]) colors[row.theme_key] = {};
      colors[row.theme_key][row.config_key] = row.config_value;
    });

    logApiSuccess('SETTINGS', 'GET');
    return NextResponse.json({ success: true, data: colors });
  } catch (error: any) {
    logApiError('SETTINGS', 'GET', error);
    return createErrorResponse('THEME_COLORS_LOAD_FAILED', 500);
  }
}

export async function PUT(request: NextRequest) {
  logApiRequest('SETTINGS', 'PUT', '/api/admin/settings/theme-colors');
  const auth = checkAdminAuth(request);
  if (auth.response) return auth.response;

  try {
    await ensureTable();
    const body = await request.json();
    const { theme_key, config_key, config_value } = body;

    if (!theme_key || !config_key || config_value === undefined) {
      return createErrorResponse('MISSING_REQUIRED_FIELDS', 400);
    }

    await query(
      `INSERT INTO theme_color_configs (theme_key, config_key, config_value, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(theme_key, config_key) DO UPDATE SET
       config_value = ?, updated_at = CURRENT_TIMESTAMP`,
      [theme_key, config_key, config_value, config_value]
    );

    await recordAdminAuditLog({
      request,
      module: 'SETTINGS',
      action: 'UPDATE_THEME_COLOR',
      description: `管理员更新主题色 ${theme_key}.${config_key}`,
      operator: auth.user.name || 'Admin',
      status: 'success',
      resourceId: `${theme_key}-${config_key}`,
      resourceType: 'theme_color_config',
      riskLevel: 'low',
      metadata: { theme_key, config_key, config_value },
    });

    logApiSuccess('SETTINGS', 'PUT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logApiError('SETTINGS', 'PUT', error);
    return createErrorResponse('THEME_COLOR_UPDATE_FAILED', 500);
  }
}
