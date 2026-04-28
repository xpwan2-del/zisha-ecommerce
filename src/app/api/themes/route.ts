import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const initDatabase = async () => {
  try {
    const tableExistsResult = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='system_configs'");
    if (!tableExistsResult.rows || tableExistsResult.rows.length === 0) {
      await query(`
        CREATE TABLE system_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          config_key VARCHAR(100) UNIQUE NOT NULL,
          config_value TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    const existingThemeResult = await query("SELECT config_value FROM system_configs WHERE config_key = 'theme'");
    if (!existingThemeResult.rows || existingThemeResult.rows.length === 0) {
      await query(
        "INSERT INTO system_configs (config_key, config_value, description) VALUES (?, ?, ?)",
        ["theme", "chinese", "网站主题配置"]
      );
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
};

initDatabase();

export async function GET() {
  try {
    const result = await query("SELECT config_value FROM system_configs WHERE config_key = 'theme'");

    return NextResponse.json({
      theme: result.rows && result.rows.length > 0 ? result.rows[0].config_value : "chinese",
    });
  } catch (error) {
    console.error("Failed to get theme:", error);
    return NextResponse.json({ theme: "chinese" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { theme } = await request.json();

    const validThemes = ["chinese", "middleEastern", "amazon", "middleEasternLuxury"];
    if (!validThemes.includes(theme)) {
      return NextResponse.json({ error: "无效的主题" }, { status: 400 });
    }

    await query(
      "INSERT OR REPLACE INTO system_configs (config_key, config_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
      ["theme", theme]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save theme:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
