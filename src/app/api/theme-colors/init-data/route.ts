import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { logMonitor } from "@/lib/utils/logger";

interface ConfigItem {
  theme: string;
  key: string;
  value: string;
  description: string;
}

const allConfigs: ConfigItem[] = [
  // chinese 主题 - 颜色配置
  { theme: "chinese", key: "primary", value: "#1A237E", description: "主色" },
  { theme: "chinese", key: "secondary", value: "#D4AF37", description: "辅助色" },
  { theme: "chinese", key: "accent", value: "#5D3B6D", description: "强调色" },
  { theme: "chinese", key: "dark", value: "#1C1C1C", description: "深色" },
  { theme: "chinese", key: "light", value: "#F9F5E9", description: "浅色" },
  { theme: "chinese", key: "background", value: "#F9F5E9", description: "背景色" },
  { theme: "chinese", key: "backgroundAlt", value: "#F0E6D2", description: "背景交替色" },
  { theme: "chinese", key: "text", value: "#1C1C1C", description: "文字色" },
  { theme: "chinese", key: "textMuted", value: "#6B7280", description: "次要文字色" },
  { theme: "chinese", key: "border", value: "#E5E7EB", description: "边框色" },
  { theme: "chinese", key: "card", value: "#FFFFFF", description: "卡片背景色" },
  { theme: "chinese", key: "primaryRgb", value: "26, 35, 126", description: "主色RGB值" },
  { theme: "chinese", key: "accentRgb", value: "93, 59, 109", description: "强调色RGB值" },
  { theme: "chinese", key: "borderRgb", value: "229, 231, 235", description: "边框RGB值" },
  // chinese 主题 - 状态颜色
  { theme: "chinese", key: "colorRed", value: "#DC2626", description: "红色" },
  { theme: "chinese", key: "colorGreen", value: "#16A34A", description: "绿色" },
  { theme: "chinese", key: "colorBlue", value: "#2563EB", description: "蓝色" },
  { theme: "chinese", key: "colorYellow", value: "#EAB308", description: "黄色" },
  { theme: "chinese", key: "colorOrange", value: "#F97316", description: "橙色" },
  // chinese 主题 - 库存状态
  { theme: "chinese", key: "inventoryStatus_inStock", value: "#16A34A", description: "有货状态颜色" },
  { theme: "chinese", key: "inventoryStatus_limited", value: "#F97316", description: "库存有限状态颜色" },
  { theme: "chinese", key: "inventoryStatus_lowStock", value: "#DC2626", description: "库存紧张状态颜色" },
  { theme: "chinese", key: "inventoryStatus_outOfStock", value: "#DC2626", description: "缺货状态颜色" },
  // chinese 主题 - 字体
  { theme: "chinese", key: "heading-font", value: "Cormorant, serif", description: "标题字体" },
  { theme: "chinese", key: "body-font", value: "Inter, sans-serif", description: "正文字体" },
  // chinese 主题 - 按钮样式
  { theme: "chinese", key: "btn-primary-bg", value: "#1A237E", description: "主按钮背景色" },
  { theme: "chinese", key: "btn-primary-text", value: "#FFFFFF", description: "主按钮文字色" },
  { theme: "chinese", key: "btn-primary-border", value: "#D4AF37", description: "主按钮边框色" },
  { theme: "chinese", key: "btn-primary-shadow", value: "0 4px 14px rgba(26, 35, 126, 0.3)", description: "主按钮阴影" },
  { theme: "chinese", key: "btn-primary-hover-bg", value: "#151E63", description: "主按钮悬停背景色" },
  { theme: "chinese", key: "btn-primary-hover-text", value: "#FFFFFF", description: "主按钮悬停文字色" },
  { theme: "chinese", key: "btn-primary-hover-border", value: "#E6C250", description: "主按钮悬停边框色" },
  { theme: "chinese", key: "btn-primary-hover-transform", value: "scale(1.05)", description: "主按钮悬停变换" },
  { theme: "chinese", key: "btn-primary-hover-shadow", value: "0 6px 20px rgba(26, 35, 126, 0.4)", description: "主按钮悬停阴影" },
  { theme: "chinese", key: "btn-secondary-bg", value: "transparent", description: "次按钮背景色" },
  { theme: "chinese", key: "btn-secondary-text", value: "#1A237E", description: "次按钮文字色" },
  { theme: "chinese", key: "btn-secondary-border", value: "#1A237E", description: "次按钮边框色" },
  { theme: "chinese", key: "btn-secondary-hover-bg", value: "#1A237E", description: "次按钮悬停背景色" },
  { theme: "chinese", key: "btn-secondary-hover-text", value: "#FFFFFF", description: "次按钮悬停文字色" },
  // chinese 主题 - 加载动画
  { theme: "chinese", key: "loading-color", value: "#1A237E", description: "加载动画颜色" },

  // middleEastern 主题 - 颜色配置
  { theme: "middleEastern", key: "primary", value: "#5D3B6D", description: "主色" },
  { theme: "middleEastern", key: "secondary", value: "#D4AF37", description: "辅助色" },
  { theme: "middleEastern", key: "accent", value: "#1E3A8A", description: "强调色" },
  { theme: "middleEastern", key: "dark", value: "#1F2937", description: "深色" },
  { theme: "middleEastern", key: "light", value: "#F3F4F6", description: "浅色" },
  { theme: "middleEastern", key: "background", value: "#F3F4F6", description: "背景色" },
  { theme: "middleEastern", key: "backgroundAlt", value: "#E5E7EB", description: "背景交替色" },
  { theme: "middleEastern", key: "text", value: "#1F2937", description: "文字色" },
  { theme: "middleEastern", key: "textMuted", value: "#6B7280", description: "次要文字色" },
  { theme: "middleEastern", key: "border", value: "#D1D5DB", description: "边框色" },
  { theme: "middleEastern", key: "card", value: "#FFFFFF", description: "卡片背景色" },
  { theme: "middleEastern", key: "primaryRgb", value: "93, 59, 109", description: "主色RGB值" },
  { theme: "middleEastern", key: "accentRgb", value: "30, 58, 138", description: "强调色RGB值" },
  { theme: "middleEastern", key: "borderRgb", value: "209, 213, 219", description: "边框RGB值" },
  // middleEastern 主题 - 状态颜色
  { theme: "middleEastern", key: "colorRed", value: "#DC2626", description: "红色" },
  { theme: "middleEastern", key: "colorGreen", value: "#16A34A", description: "绿色" },
  { theme: "middleEastern", key: "colorBlue", value: "#2563EB", description: "蓝色" },
  { theme: "middleEastern", key: "colorYellow", value: "#EAB308", description: "黄色" },
  { theme: "middleEastern", key: "colorOrange", value: "#F97316", description: "橙色" },
  // middleEastern 主题 - 库存状态
  { theme: "middleEastern", key: "inventoryStatus_inStock", value: "#16A34A", description: "有货状态颜色" },
  { theme: "middleEastern", key: "inventoryStatus_limited", value: "#F97316", description: "库存有限状态颜色" },
  { theme: "middleEastern", key: "inventoryStatus_lowStock", value: "#DC2626", description: "库存紧张状态颜色" },
  { theme: "middleEastern", key: "inventoryStatus_outOfStock", value: "#DC2626", description: "缺货状态颜色" },
  // middleEastern 主题 - 字体
  { theme: "middleEastern", key: "heading-font", value: "Cormorant, serif", description: "标题字体" },
  { theme: "middleEastern", key: "body-font", value: "Inter, sans-serif", description: "正文字体" },
  // middleEastern 主题 - 按钮样式
  { theme: "middleEastern", key: "btn-primary-bg", value: "#5D3B6D", description: "主按钮背景色" },
  { theme: "middleEastern", key: "btn-primary-text", value: "#FFFFFF", description: "主按钮文字色" },
  { theme: "middleEastern", key: "btn-primary-border", value: "#D4AF37", description: "主按钮边框色" },
  { theme: "middleEastern", key: "btn-primary-shadow", value: "0 4px 14px rgba(93, 59, 109, 0.3)", description: "主按钮阴影" },
  { theme: "middleEastern", key: "btn-primary-hover-bg", value: "#4A2D58", description: "主按钮悬停背景色" },
  { theme: "middleEastern", key: "btn-primary-hover-text", value: "#FFFFFF", description: "主按钮悬停文字色" },
  { theme: "middleEastern", key: "btn-primary-hover-border", value: "#E6C250", description: "主按钮悬停边框色" },
  { theme: "middleEastern", key: "btn-primary-hover-transform", value: "scale(1.05)", description: "主按钮悬停变换" },
  { theme: "middleEastern", key: "btn-primary-hover-shadow", value: "0 6px 20px rgba(93, 59, 109, 0.4)", description: "主按钮悬停阴影" },
  { theme: "middleEastern", key: "btn-secondary-bg", value: "transparent", description: "次按钮背景色" },
  { theme: "middleEastern", key: "btn-secondary-text", value: "#5D3B6D", description: "次按钮文字色" },
  { theme: "middleEastern", key: "btn-secondary-border", value: "#5D3B6D", description: "次按钮边框色" },
  { theme: "middleEastern", key: "btn-secondary-hover-bg", value: "#5D3B6D", description: "次按钮悬停背景色" },
  { theme: "middleEastern", key: "btn-secondary-hover-text", value: "#FFFFFF", description: "次按钮悬停文字色" },
  // middleEastern 主题 - 加载动画
  { theme: "middleEastern", key: "loading-color", value: "#5D3B6D", description: "加载动画颜色" },

  // amazon 主题 - 颜色配置
  { theme: "amazon", key: "primary", value: "#FF9900", description: "主色" },
  { theme: "amazon", key: "secondary", value: "#007185", description: "辅助色" },
  { theme: "amazon", key: "accent", value: "#374151", description: "强调色" },
  { theme: "amazon", key: "dark", value: "#111111", description: "深色" },
  { theme: "amazon", key: "light", value: "#F5F5F5", description: "浅色" },
  { theme: "amazon", key: "background", value: "#FFFFFF", description: "背景色" },
  { theme: "amazon", key: "backgroundAlt", value: "#F5F5F5", description: "背景交替色" },
  { theme: "amazon", key: "text", value: "#111111", description: "文字色" },
  { theme: "amazon", key: "textMuted", value: "#6B7280", description: "次要文字色" },
  { theme: "amazon", key: "border", value: "#E5E7EB", description: "边框色" },
  { theme: "amazon", key: "card", value: "#FFFFFF", description: "卡片背景色" },
  { theme: "amazon", key: "primaryRgb", value: "255, 153, 0", description: "主色RGB值" },
  { theme: "amazon", key: "accentRgb", value: "55, 65, 81", description: "强调色RGB值" },
  { theme: "amazon", key: "borderRgb", value: "229, 231, 235", description: "边框RGB值" },
  // amazon 主题 - 状态颜色
  { theme: "amazon", key: "colorRed", value: "#DC2626", description: "红色" },
  { theme: "amazon", key: "colorGreen", value: "#16A34A", description: "绿色" },
  { theme: "amazon", key: "colorBlue", value: "#2563EB", description: "蓝色" },
  { theme: "amazon", key: "colorYellow", value: "#EAB308", description: "黄色" },
  { theme: "amazon", key: "colorOrange", value: "#F97316", description: "橙色" },
  // amazon 主题 - 库存状态
  { theme: "amazon", key: "inventoryStatus_inStock", value: "#16A34A", description: "有货状态颜色" },
  { theme: "amazon", key: "inventoryStatus_limited", value: "#F97316", description: "库存有限状态颜色" },
  { theme: "amazon", key: "inventoryStatus_lowStock", value: "#DC2626", description: "库存紧张状态颜色" },
  { theme: "amazon", key: "inventoryStatus_outOfStock", value: "#DC2626", description: "缺货状态颜色" },
  // amazon 主题 - 字体
  { theme: "amazon", key: "heading-font", value: "Inter, sans-serif", description: "标题字体" },
  { theme: "amazon", key: "body-font", value: "Inter, sans-serif", description: "正文字体" },
  // amazon 主题 - 按钮样式
  { theme: "amazon", key: "btn-primary-bg", value: "#FF9900", description: "主按钮背景色" },
  { theme: "amazon", key: "btn-primary-text", value: "#111111", description: "主按钮文字色" },
  { theme: "amazon", key: "btn-primary-border", value: "#FF9900", description: "主按钮边框色" },
  { theme: "amazon", key: "btn-primary-shadow", value: "0 4px 14px rgba(255, 153, 0, 0.3)", description: "主按钮阴影" },
  { theme: "amazon", key: "btn-primary-hover-bg", value: "#E68A00", description: "主按钮悬停背景色" },
  { theme: "amazon", key: "btn-primary-hover-text", value: "#111111", description: "主按钮悬停文字色" },
  { theme: "amazon", key: "btn-primary-hover-border", value: "#E68A00", description: "主按钮悬停边框色" },
  { theme: "amazon", key: "btn-primary-hover-transform", value: "scale(1.05)", description: "主按钮悬停变换" },
  { theme: "amazon", key: "btn-primary-hover-shadow", value: "0 6px 20px rgba(255, 153, 0, 0.4)", description: "主按钮悬停阴影" },
  { theme: "amazon", key: "btn-secondary-bg", value: "#007185", description: "次按钮背景色" },
  { theme: "amazon", key: "btn-secondary-text", value: "#FFFFFF", description: "次按钮文字色" },
  { theme: "amazon", key: "btn-secondary-border", value: "#007185", description: "次按钮边框色" },
  { theme: "amazon", key: "btn-secondary-hover-bg", value: "#005F75", description: "次按钮悬停背景色" },
  { theme: "amazon", key: "btn-secondary-hover-text", value: "#FFFFFF", description: "次按钮悬停文字色" },
  // amazon 主题 - 加载动画
  { theme: "amazon", key: "loading-color", value: "#FF9900", description: "加载动画颜色" },

  // middleEasternLuxury 主题 - 颜色配置
  { theme: "middleEasternLuxury", key: "primary", value: "#5D3B6D", description: "主色" },
  { theme: "middleEasternLuxury", key: "secondary", value: "#D4AF37", description: "辅助色" },
  { theme: "middleEasternLuxury", key: "accent", value: "#8B4513", description: "强调色" },
  { theme: "middleEasternLuxury", key: "dark", value: "#1F2937", description: "深色" },
  { theme: "middleEasternLuxury", key: "light", value: "#F3F4F6", description: "浅色" },
  { theme: "middleEasternLuxury", key: "background", value: "#F3F4F6", description: "背景色" },
  { theme: "middleEasternLuxury", key: "backgroundAlt", value: "#E5E7EB", description: "背景交替色" },
  { theme: "middleEasternLuxury", key: "text", value: "#1F2937", description: "文字色" },
  { theme: "middleEasternLuxury", key: "textMuted", value: "#6B7280", description: "次要文字色" },
  { theme: "middleEasternLuxury", key: "border", value: "#D1D5DB", description: "边框色" },
  { theme: "middleEasternLuxury", key: "card", value: "#FFFFFF", description: "卡片背景色" },
  { theme: "middleEasternLuxury", key: "primaryRgb", value: "93, 59, 109", description: "主色RGB值" },
  { theme: "middleEasternLuxury", key: "accentRgb", value: "139, 69, 19", description: "强调色RGB值" },
  { theme: "middleEasternLuxury", key: "borderRgb", value: "209, 213, 219", description: "边框RGB值" },
  // middleEasternLuxury 主题 - 状态颜色
  { theme: "middleEasternLuxury", key: "colorRed", value: "#DC2626", description: "红色" },
  { theme: "middleEasternLuxury", key: "colorGreen", value: "#16A34A", description: "绿色" },
  { theme: "middleEasternLuxury", key: "colorBlue", value: "#2563EB", description: "蓝色" },
  { theme: "middleEasternLuxury", key: "colorYellow", value: "#EAB308", description: "黄色" },
  { theme: "middleEasternLuxury", key: "colorOrange", value: "#F97316", description: "橙色" },
  // middleEasternLuxury 主题 - 库存状态
  { theme: "middleEasternLuxury", key: "inventoryStatus_inStock", value: "#16A34A", description: "有货状态颜色" },
  { theme: "middleEasternLuxury", key: "inventoryStatus_limited", value: "#F97316", description: "库存有限状态颜色" },
  { theme: "middleEasternLuxury", key: "inventoryStatus_lowStock", value: "#DC2626", description: "库存紧张状态颜色" },
  { theme: "middleEasternLuxury", key: "inventoryStatus_outOfStock", value: "#DC2626", description: "缺货状态颜色" },
  // middleEasternLuxury 主题 - 字体
  { theme: "middleEasternLuxury", key: "heading-font", value: "Cormorant, serif", description: "标题字体" },
  { theme: "middleEasternLuxury", key: "body-font", value: "Inter, sans-serif", description: "正文字体" },
  // middleEasternLuxury 主题 - 按钮样式
  { theme: "middleEasternLuxury", key: "btn-primary-bg", value: "#5D3B6D", description: "主按钮背景色" },
  { theme: "middleEasternLuxury", key: "btn-primary-text", value: "#FFFFFF", description: "主按钮文字色" },
  { theme: "middleEasternLuxury", key: "btn-primary-border", value: "#D4AF37", description: "主按钮边框色" },
  { theme: "middleEasternLuxury", key: "btn-primary-shadow", value: "0 4px 14px rgba(93, 59, 109, 0.3)", description: "主按钮阴影" },
  { theme: "middleEasternLuxury", key: "btn-primary-hover-bg", value: "#4A2D58", description: "主按钮悬停背景色" },
  { theme: "middleEasternLuxury", key: "btn-primary-hover-text", value: "#FFFFFF", description: "主按钮悬停文字色" },
  { theme: "middleEasternLuxury", key: "btn-primary-hover-border", value: "#E6C250", description: "主按钮悬停边框色" },
  { theme: "middleEasternLuxury", key: "btn-primary-hover-transform", value: "scale(1.05)", description: "主按钮悬停变换" },
  { theme: "middleEasternLuxury", key: "btn-primary-hover-shadow", value: "0 6px 20px rgba(93, 59, 109, 0.4)", description: "主按钮悬停阴影" },
  { theme: "middleEasternLuxury", key: "btn-secondary-bg", value: "transparent", description: "次按钮背景色" },
  { theme: "middleEasternLuxury", key: "btn-secondary-text", value: "#5D3B6D", description: "次按钮文字色" },
  { theme: "middleEasternLuxury", key: "btn-secondary-border", value: "#5D3B6D", description: "次按钮边框色" },
  { theme: "middleEasternLuxury", key: "btn-secondary-hover-bg", value: "#5D3B6D", description: "次按钮悬停背景色" },
  { theme: "middleEasternLuxury", key: "btn-secondary-hover-text", value: "#FFFFFF", description: "次按钮悬停文字色" },
  // middleEasternLuxury 主题 - 加载动画
  { theme: "middleEasternLuxury", key: "loading-color", value: "#5D3B6D", description: "加载动画颜色" },
];

export async function POST(request: NextRequest) {
  try {
    logMonitor('THEME_COLORS', 'REQUEST', { method: 'POST', action: 'INIT_THEME_COLORS_DATA' });
    
    const { searchParams } = new URL(request.url);
    const theme = searchParams.get("theme");

    let configsToInsert = allConfigs;
    if (theme && theme !== "all") {
      configsToInsert = allConfigs.filter(c => c.theme === theme);
    }

    let insertedCount = 0;
    for (const config of configsToInsert) {
      await query(
        `INSERT OR REPLACE INTO theme_color_configs
         (theme_key, config_key, config_value, description, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [config.theme, config.key, config.value, config.description]
      );
      insertedCount++;
    }

    logMonitor('THEME_COLORS', 'SUCCESS', { action: 'INIT_THEME_COLORS_DATA', insertedCount, theme: theme || 'all' });
    
    return NextResponse.json({
      success: true,
      message: `Initialized ${insertedCount} configs`,
      themes: Array.from(new Set(allConfigs.map(c => c.theme)))
    });
  } catch (error: any) {
    logMonitor('THEME_COLORS', 'ERROR', { action: 'INIT_THEME_COLORS_DATA', error: error?.message || String(error) });
    console.error("Failed to initialize configs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize configs" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    logMonitor('THEME_COLORS', 'REQUEST', { method: 'GET', action: 'CHECK_THEME_COLORS' });
    
    const result = await query("SELECT COUNT(*) as count FROM theme_color_configs");
    const totalInDb = result.rows?.[0]?.count || 0;

    logMonitor('THEME_COLORS', 'SUCCESS', { action: 'CHECK_THEME_COLORS', totalInDb, totalInConfig: allConfigs.length, needsInit: totalInDb < allConfigs.length });
    
    return NextResponse.json({
      success: true,
      totalInDb,
      totalInConfig: allConfigs.length,
      needsInit: totalInDb < allConfigs.length
    });
  } catch (error: any) {
    logMonitor('THEME_COLORS', 'ERROR', { action: 'CHECK_THEME_COLORS', error: error?.message || String(error) });
    console.error("Failed to check configs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check" },
      { status: 500 }
    );
  }
}
