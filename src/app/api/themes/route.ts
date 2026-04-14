import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

// 初始化数据库表
const initDatabase = async () => {
  try {
    const db = await getDB();
    // 检查表是否存在，如果不存在则创建
    const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='system_configs'");
    if (!tableExists) {
      await db.run(`
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
    
    const existingTheme = await db.get("SELECT config_value FROM system_configs WHERE config_key = 'theme'");
    if (!existingTheme) {
      await db.run(
        "INSERT INTO system_configs (config_key, config_value, description) VALUES (?, ?, ?)",
        "theme",
        "chinese",
        "网站主题配置"
      );
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
};

initDatabase();

export async function GET() {
  try {
    const db = await getDB();
    const result = await db.get(
      "SELECT config_value FROM system_configs WHERE config_key = 'theme'"
    );
    
    return NextResponse.json({
      theme: result?.config_value || "chinese",
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
    
    const db = await getDB();
    await db.run(
      "INSERT OR REPLACE INTO system_configs (config_key, config_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
      "theme",
      theme
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save theme:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
