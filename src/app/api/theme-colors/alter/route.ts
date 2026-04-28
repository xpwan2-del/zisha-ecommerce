import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const tableInfoResult = await query("PRAGMA table_info(theme_color_configs)");
    const columns = tableInfoResult.rows ? tableInfoResult.rows.map((col: any) => col.name) : [];

    if (!columns.includes('description')) {
      await query("ALTER TABLE theme_color_configs ADD COLUMN description TEXT");
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
