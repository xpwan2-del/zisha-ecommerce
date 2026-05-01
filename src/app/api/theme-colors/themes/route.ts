import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { logMonitor } from "@/lib/utils/logger";

export async function GET() {
  try {
    logMonitor('THEME_COLORS', 'REQUEST', { method: 'GET', action: 'GET_THEMES' });
    
    const result = await query(
      "SELECT DISTINCT theme_key FROM theme_color_configs"
    );

    const themeNames: Record<string, string> = {
      chinese: "传统中国风",
      middleEastern: "中东高档风",
      amazon: "亚马逊风",
      middleEasternLuxury: "中东奢华风",
    };

    const themes: Record<string, { name: string }> = {};
    if (result.rows) {
      for (const row of result.rows) {
        const key = row.theme_key as string;
        themes[key] = {
          name: themeNames[key] || key,
        };
      }
    }

    logMonitor('THEME_COLORS', 'SUCCESS', { action: 'GET_THEMES', themeCount: Object.keys(themes).length });
    
    return NextResponse.json({
      success: true,
      data: themes,
    });
  } catch (error: any) {
    logMonitor('THEME_COLORS', 'ERROR', { action: 'GET_THEMES', error: error?.message || String(error) });
    console.error("Failed to get themes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get themes" },
      { status: 500 }
    );
  }
}
