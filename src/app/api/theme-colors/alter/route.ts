import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const db = await getDB();

    const tableInfo = await db.all("PRAGMA table_info(theme_color_configs)");
    const columns = tableInfo.map((col: any) => col.name);

    if (!columns.includes('description')) {
      await db.run("ALTER TABLE theme_color_configs ADD COLUMN description TEXT");
    }

    return NextResponse.json({
      success: true,
      message: "Table structure updated",
      columns: columns
    });
  } catch (error) {
    console.error("Failed to update table structure:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update table structure" },
      { status: 500 }
    );
  }
}
