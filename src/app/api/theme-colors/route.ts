import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

const initDatabase = async () => {
  try {
    const db = await getDB();

    const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='theme_color_configs'");
    if (!tableExists) {
      await db.run(`
        CREATE TABLE theme_color_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          theme_key VARCHAR(50) NOT NULL,
          config_key VARCHAR(100) NOT NULL,
          config_value TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(theme_key, config_key)
        )
      `);

      const defaultConfigs = [
        { theme: "chinese", key: "primary", value: "#1A237E" },
        { theme: "chinese", key: "secondary", value: "#D4AF37" },
        { theme: "chinese", key: "accent", value: "#5D3B6D" },
        { theme: "chinese", key: "dark", value: "#1C1C1C" },
        { theme: "chinese", key: "light", value: "#F9F5E9" },
        { theme: "chinese", key: "background", value: "#F9F5E9" },
        { theme: "chinese", key: "backgroundAlt", value: "#F0E6D2" },
        { theme: "chinese", key: "text", value: "#1C1C1C" },
        { theme: "chinese", key: "textMuted", value: "#6B7280" },
        { theme: "chinese", key: "border", value: "#E5E7EB" },
        { theme: "chinese", key: "card", value: "#FFFFFF" },
        { theme: "chinese", key: "primaryRgb", value: "26, 35, 126" },
        { theme: "chinese", key: "accentRgb", value: "93, 59, 109" },
        { theme: "chinese", key: "borderRgb", value: "229, 231, 235" },
        { theme: "chinese", key: "colorRed", value: "#DC2626" },
        { theme: "chinese", key: "colorGreen", value: "#16A34A" },
        { theme: "chinese", key: "colorBlue", value: "#2563EB" },
        { theme: "chinese", key: "colorYellow", value: "#EAB308" },
        { theme: "chinese", key: "colorOrange", value: "#F97316" },
        { theme: "chinese", key: "inventoryStatus_inStock", value: "#16A34A" },
        { theme: "chinese", key: "inventoryStatus_limited", value: "#F97316" },
        { theme: "chinese", key: "inventoryStatus_lowStock", value: "#DC2626" },
        { theme: "chinese", key: "inventoryStatus_outOfStock", value: "#DC2626" },

        { theme: "middleEastern", key: "primary", value: "#5D3B6D" },
        { theme: "middleEastern", key: "secondary", value: "#D4AF37" },
        { theme: "middleEastern", key: "accent", value: "#1E3A8A" },
        { theme: "middleEastern", key: "dark", value: "#1F2937" },
        { theme: "middleEastern", key: "light", value: "#F3F4F6" },
        { theme: "middleEastern", key: "background", value: "#F3F4F6" },
        { theme: "middleEastern", key: "backgroundAlt", value: "#E5E7EB" },
        { theme: "middleEastern", key: "text", value: "#1F2937" },
        { theme: "middleEastern", key: "textMuted", value: "#6B7280" },
        { theme: "middleEastern", key: "border", value: "#D1D5DB" },
        { theme: "middleEastern", key: "card", value: "#FFFFFF" },
        { theme: "middleEastern", key: "primaryRgb", value: "93, 59, 109" },
        { theme: "middleEastern", key: "accentRgb", value: "30, 58, 138" },
        { theme: "middleEastern", key: "borderRgb", value: "209, 213, 219" },
        { theme: "middleEastern", key: "colorRed", value: "#DC2626" },
        { theme: "middleEastern", key: "colorGreen", value: "#16A34A" },
        { theme: "middleEastern", key: "colorBlue", value: "#2563EB" },
        { theme: "middleEastern", key: "colorYellow", value: "#EAB308" },
        { theme: "middleEastern", key: "colorOrange", value: "#F97316" },
        { theme: "middleEastern", key: "inventoryStatus_inStock", value: "#16A34A" },
        { theme: "middleEastern", key: "inventoryStatus_limited", value: "#F97316" },
        { theme: "middleEastern", key: "inventoryStatus_lowStock", value: "#DC2626" },
        { theme: "middleEastern", key: "inventoryStatus_outOfStock", value: "#DC2626" },

        { theme: "amazon", key: "primary", value: "#FF9900" },
        { theme: "amazon", key: "secondary", value: "#007185" },
        { theme: "amazon", key: "accent", value: "#374151" },
        { theme: "amazon", key: "dark", value: "#111111" },
        { theme: "amazon", key: "light", value: "#F5F5F5" },
        { theme: "amazon", key: "background", value: "#FFFFFF" },
        { theme: "amazon", key: "backgroundAlt", value: "#F5F5F5" },
        { theme: "amazon", key: "text", value: "#111111" },
        { theme: "amazon", key: "textMuted", value: "#6B7280" },
        { theme: "amazon", key: "border", value: "#E5E7EB" },
        { theme: "amazon", key: "card", value: "#FFFFFF" },
        { theme: "amazon", key: "primaryRgb", value: "255, 153, 0" },
        { theme: "amazon", key: "accentRgb", value: "55, 65, 81" },
        { theme: "amazon", key: "borderRgb", value: "229, 231, 235" },
        { theme: "amazon", key: "colorRed", value: "#DC2626" },
        { theme: "amazon", key: "colorGreen", value: "#16A34A" },
        { theme: "amazon", key: "colorBlue", value: "#2563EB" },
        { theme: "amazon", key: "colorYellow", value: "#EAB308" },
        { theme: "amazon", key: "colorOrange", value: "#F97316" },
        { theme: "amazon", key: "inventoryStatus_inStock", value: "#16A34A" },
        { theme: "amazon", key: "inventoryStatus_limited", value: "#F97316" },
        { theme: "amazon", key: "inventoryStatus_lowStock", value: "#DC2626" },
        { theme: "amazon", key: "inventoryStatus_outOfStock", value: "#DC2626" },

        { theme: "middleEasternLuxury", key: "primary", value: "#5D3B6D" },
        { theme: "middleEasternLuxury", key: "secondary", value: "#D4AF37" },
        { theme: "middleEasternLuxury", key: "accent", value: "#8B4513" },
        { theme: "middleEasternLuxury", key: "dark", value: "#1F2937" },
        { theme: "middleEasternLuxury", key: "light", value: "#F3F4F6" },
        { theme: "middleEasternLuxury", key: "background", value: "#F3F4F6" },
        { theme: "middleEasternLuxury", key: "backgroundAlt", value: "#E5E7EB" },
        { theme: "middleEasternLuxury", key: "text", value: "#1F2937" },
        { theme: "middleEasternLuxury", key: "textMuted", value: "#6B7280" },
        { theme: "middleEasternLuxury", key: "border", value: "#D1D5DB" },
        { theme: "middleEasternLuxury", key: "card", value: "#FFFFFF" },
        { theme: "middleEasternLuxury", key: "primaryRgb", value: "93, 59, 109" },
        { theme: "middleEasternLuxury", key: "accentRgb", value: "139, 69, 19" },
        { theme: "middleEasternLuxury", key: "borderRgb", value: "209, 213, 219" },
        { theme: "middleEasternLuxury", key: "colorRed", value: "#DC2626" },
        { theme: "middleEasternLuxury", key: "colorGreen", value: "#16A34A" },
        { theme: "middleEasternLuxury", key: "colorBlue", value: "#2563EB" },
        { theme: "middleEasternLuxury", key: "colorYellow", value: "#EAB308" },
        { theme: "middleEasternLuxury", key: "colorOrange", value: "#F97316" },
        { theme: "middleEasternLuxury", key: "inventoryStatus_inStock", value: "#16A34A" },
        { theme: "middleEasternLuxury", key: "inventoryStatus_limited", value: "#F97316" },
        { theme: "middleEasternLuxury", key: "inventoryStatus_lowStock", value: "#DC2626" },
        { theme: "middleEasternLuxury", key: "inventoryStatus_outOfStock", value: "#DC2626" },
      ];

      for (const config of defaultConfigs) {
        await db.run(
          "INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES (?, ?, ?)",
          [config.theme, config.key, config.value]
        );
      }
    }
  } catch (error) {
    console.error("Failed to initialize theme_color_configs:", error);
  }
};

initDatabase();

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();

    const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='theme_color_configs'");
    if (!tableExists) {
      return NextResponse.json({ success: false, error: "Table not initialized" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const theme = searchParams.get("theme");

    let sql = "SELECT theme_key, config_key, config_value FROM theme_color_configs";
    let params: any[] = [];

    if (theme) {
      sql += " WHERE theme_key = ?";
      params = [theme];
    }

    const result = await db.all(sql, params);

    const configs: Record<string, Record<string, string>> = {};
    for (const row of result) {
      const themeKey = row.theme_key as string;
      const configKey = row.config_key as string;
      const configValue = row.config_value as string;

      if (!configs[themeKey]) {
        configs[themeKey] = {};
      }
      configs[themeKey][configKey] = configValue;
    }

    return NextResponse.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error("Failed to get theme colors:", error);
    return NextResponse.json({ success: false, error: "Failed to get theme colors" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { theme_key, config_key, config_value } = body;

    if (!theme_key || !config_key || config_value === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const db = await getDB();

    const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='theme_color_configs'");
    if (!tableExists) {
      return NextResponse.json({ success: false, error: "Table not initialized" }, { status: 500 });
    }

    await db.run(
      `INSERT OR REPLACE INTO theme_color_configs (theme_key, config_key, config_value, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [theme_key, config_key, config_value]
    );

    return NextResponse.json({ success: true, message: "Config updated successfully" });
  } catch (error) {
    console.error("Failed to update theme color:", error);
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 });
  }
}
