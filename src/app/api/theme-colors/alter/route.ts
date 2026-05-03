import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { logMonitor } from '@/lib/utils/logger';
/**
 * @api {POST} /api/theme-colors/alter 切换主题颜色
 * @apiName AlterThemeColors
 * @apiGroup THEMES
 * @apiDescription 切换当前使用的主题配色方案。
 */


export async function POST(request: NextRequest) {
  try {
    logMonitor('THEME_COLORS', 'REQUEST', { method: 'POST', action: 'ALTER_THEME_COLORS' });
    
    const tableInfoResult = await query("PRAGMA table_info(theme_color_configs)");
    const columns = tableInfoResult.rows ? tableInfoResult.rows.map((col: any) => col.name) : [];

    if (!columns.includes('description')) {
      await query("ALTER TABLE theme_color_configs ADD COLUMN description TEXT");
    }

    logMonitor('THEME_COLORS', 'SUCCESS', { action: 'ALTER_THEME_COLORS', status: 'updated', columnsAdded: !columns.includes('description') ? 1 : 0 });
    
    return NextResponse.json({
      success: true,
      message: "Table structure updated",
      columns: columns
    });
  } catch (error: any) {
    logMonitor('THEME_COLORS', 'ERROR', { action: 'ALTER_THEME_COLORS', error: error?.message || String(error) });
    console.error("Failed to update table structure:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update table structure" },
      { status: 500 }
    );
  }
}
