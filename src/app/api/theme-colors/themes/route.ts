import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDB();

    const result = await db.all(
      "SELECT DISTINCT theme_key FROM theme_color_configs"
    );

    const themeNames: Record<string, string> = {
      chinese: "传统中国风",
      middleEastern: "中东高档风",
      amazon: "亚马逊风",
      middleEasternLuxury: "中东奢华风",
    };

    const themes: Record<string, { name: string }> = {};
    for (const row of result) {
      const key = row.theme_key as string;
      themes[key] = {
        name: themeNames[key] || key,
      };
    }

    return NextResponse.json({
      success: true,
      data: themes,
    });
  } catch (error) {
    console.error("Failed to get themes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get themes" },
      { status: 500 }
    );
  }
}
