import type { CSSProperties } from "react";
import { query } from "@/lib/db";

type ThemeKey = "chinese" | "middleEastern" | "amazon" | "middleEasternLuxury";

export interface ThemeBootstrapData {
  theme: ThemeKey;
  themeColors: Record<string, string>;
  cssVariables: CSSProperties;
}

const VALID_THEMES: ThemeKey[] = ["chinese", "middleEastern", "amazon", "middleEasternLuxury"];

const FALLBACK_COLORS: Record<string, string> = {
  primary: "#1A237E",
  secondary: "#D4AF37",
  accent: "#5D3B6D",
  dark: "#1C1C1C",
  light: "#F9F5E9",
  background: "#F9F5E9",
  backgroundAlt: "#F0E6D2",
  text: "#1C1C1C",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  card: "#FFFFFF",
  primaryRgb: "26, 35, 126",
  accentRgb: "93, 59, 109",
  borderRgb: "229, 231, 235",
  headingFont: "Cormorant, serif",
  bodyFont: "Inter, sans-serif",
  colorRed: "#DC2626",
  colorGreen: "#16A34A",
  colorBlue: "#2563EB",
  colorYellow: "#EAB308",
  colorOrange: "#F97316",
  btnPrimaryBg: "#1A237E",
  btnPrimaryText: "#FFFFFF",
  btnPrimaryBorder: "#D4AF37",
  btnPrimaryShadow: "0 4px 14px rgba(26, 35, 126, 0.3)",
  btnPrimaryHoverBg: "#151E63",
  btnPrimaryHoverText: "#FFFFFF",
  btnPrimaryHoverBorder: "#E6C250",
  btnPrimaryHoverTransform: "scale(1.05)",
  btnPrimaryHoverShadow: "0 6px 20px rgba(26, 35, 126, 0.4)",
  btnSecondaryBg: "transparent",
  btnSecondaryText: "#1A237E",
  btnSecondaryBorder: "#1A237E",
  btnSecondaryHoverBg: "#1A237E",
  btnSecondaryHoverText: "#FFFFFF",
  loadingColor: "#1A237E",
  inventoryStatusInStock: "#16A34A",
  inventoryStatusLimited: "#F97316",
  inventoryStatusLowStock: "#DC2626",
  inventoryStatusOutOfStock: "#DC2626",
  promotionBadgeBg: "linear-gradient(135deg, #EF4444, rgba(239, 68, 68, 0.6))",
  promotionBadgeText: "#FFFFFF",
  promotionFinalBadgeBg: "#EF4444",
  promotionFinalBadgeText: "#FFFFFF",
  limitedBadgeBg: "#D4AF37",
  limitedBadgeText: "#FFFFFF",
  activityBadge1: "#FF5733",
  activityBadge2: "#33FF57",
  activityBadge3: "#3357FF",
  activityBadge4: "#FF33F1",
  activityBadge5: "#FFB733",
  activityBadge6: "#33C1FF",
  activityBadge7: "#FF3366",
  activityBadge8: "#2ECC71",
  activityBadge9: "#3498DB",
  activityBadge10: "#E74C3C",
  reviewFeedbackSuccessBg: "#ECFDF5",
  reviewFeedbackSuccessBorder: "#86EFAC",
  reviewFeedbackSuccessText: "#14532D",
  reviewFeedbackIconBg: "#16A34A",
  reviewFeedbackIconText: "#FFFFFF",
  reviewFeedbackBadgeBg: "#16A34A",
  reviewFeedbackBadgeText: "#FFFFFF",
  reviewFeedbackErrorBg: "#FEF2F2",
  reviewFeedbackErrorBorder: "#FCA5A5",
  reviewFeedbackErrorText: "#991B1B",
  reviewStarActive: "#F59E0B",
};

function normalizeThemeKey(theme: string | undefined): ThemeKey {
  return VALID_THEMES.includes(theme as ThemeKey) ? (theme as ThemeKey) : "chinese";
}

function convertDbToCssVars(dbColors: Record<string, string>): Record<string, string> {
  return {
    primary: dbColors.primary || FALLBACK_COLORS.primary,
    secondary: dbColors.secondary || FALLBACK_COLORS.secondary,
    accent: dbColors.accent || FALLBACK_COLORS.accent,
    dark: dbColors.dark || FALLBACK_COLORS.dark,
    light: dbColors.light || FALLBACK_COLORS.light,
    background: dbColors.background || FALLBACK_COLORS.background,
    backgroundAlt: dbColors.backgroundAlt || FALLBACK_COLORS.backgroundAlt,
    text: dbColors.text || FALLBACK_COLORS.text,
    textMuted: dbColors.textMuted || FALLBACK_COLORS.textMuted,
    border: dbColors.border || FALLBACK_COLORS.border,
    card: dbColors.card || FALLBACK_COLORS.card,
    primaryRgb: dbColors.primaryRgb || FALLBACK_COLORS.primaryRgb,
    accentRgb: dbColors.accentRgb || FALLBACK_COLORS.accentRgb,
    borderRgb: dbColors.borderRgb || FALLBACK_COLORS.borderRgb,
    headingFont: dbColors["heading-font"] || FALLBACK_COLORS.headingFont,
    bodyFont: dbColors["body-font"] || FALLBACK_COLORS.bodyFont,
    colorRed: dbColors.colorRed || FALLBACK_COLORS.colorRed,
    colorGreen: dbColors.colorGreen || FALLBACK_COLORS.colorGreen,
    colorBlue: dbColors.colorBlue || FALLBACK_COLORS.colorBlue,
    colorYellow: dbColors.colorYellow || FALLBACK_COLORS.colorYellow,
    colorOrange: dbColors.colorOrange || FALLBACK_COLORS.colorOrange,
    btnPrimaryBg: dbColors["btn-primary-bg"] || FALLBACK_COLORS.btnPrimaryBg,
    btnPrimaryText: dbColors["btn-primary-text"] || FALLBACK_COLORS.btnPrimaryText,
    btnPrimaryBorder: dbColors["btn-primary-border"] || FALLBACK_COLORS.btnPrimaryBorder,
    btnPrimaryShadow: dbColors["btn-primary-shadow"] || FALLBACK_COLORS.btnPrimaryShadow,
    btnPrimaryHoverBg: dbColors["btn-primary-hover-bg"] || FALLBACK_COLORS.btnPrimaryHoverBg,
    btnPrimaryHoverText: dbColors["btn-primary-hover-text"] || FALLBACK_COLORS.btnPrimaryHoverText,
    btnPrimaryHoverBorder: dbColors["btn-primary-hover-border"] || FALLBACK_COLORS.btnPrimaryHoverBorder,
    btnPrimaryHoverTransform: dbColors["btn-primary-hover-transform"] || FALLBACK_COLORS.btnPrimaryHoverTransform,
    btnPrimaryHoverShadow: dbColors["btn-primary-hover-shadow"] || FALLBACK_COLORS.btnPrimaryHoverShadow,
    btnSecondaryBg: dbColors["btn-secondary-bg"] || FALLBACK_COLORS.btnSecondaryBg,
    btnSecondaryText: dbColors["btn-secondary-text"] || FALLBACK_COLORS.btnSecondaryText,
    btnSecondaryBorder: dbColors["btn-secondary-border"] || FALLBACK_COLORS.btnSecondaryBorder,
    btnSecondaryHoverBg: dbColors["btn-secondary-hover-bg"] || FALLBACK_COLORS.btnSecondaryHoverBg,
    btnSecondaryHoverText: dbColors["btn-secondary-hover-text"] || FALLBACK_COLORS.btnSecondaryHoverText,
    loadingColor: dbColors["loading-color"] || FALLBACK_COLORS.loadingColor,
    inventoryStatusInStock: dbColors.inventoryStatus_inStock || FALLBACK_COLORS.inventoryStatusInStock,
    inventoryStatusLimited: dbColors.inventoryStatus_limited || FALLBACK_COLORS.inventoryStatusLimited,
    inventoryStatusLowStock: dbColors.inventoryStatus_lowStock || FALLBACK_COLORS.inventoryStatusLowStock,
    inventoryStatusOutOfStock: dbColors.inventoryStatus_outOfStock || FALLBACK_COLORS.inventoryStatusOutOfStock,
    promotionBadgeBg: dbColors.promotionBadgeBg || FALLBACK_COLORS.promotionBadgeBg,
    promotionBadgeText: dbColors.promotionBadgeText || FALLBACK_COLORS.promotionBadgeText,
    promotionFinalBadgeBg: dbColors.promotionFinalBadgeBg || FALLBACK_COLORS.promotionFinalBadgeBg,
    promotionFinalBadgeText: dbColors.promotionFinalBadgeText || FALLBACK_COLORS.promotionFinalBadgeText,
    limitedBadgeBg: dbColors.limitedBadgeBg || FALLBACK_COLORS.limitedBadgeBg,
    limitedBadgeText: dbColors.limitedBadgeText || FALLBACK_COLORS.limitedBadgeText,
    activityBadge1: dbColors.activityBadge1 || FALLBACK_COLORS.activityBadge1,
    activityBadge2: dbColors.activityBadge2 || FALLBACK_COLORS.activityBadge2,
    activityBadge3: dbColors.activityBadge3 || FALLBACK_COLORS.activityBadge3,
    activityBadge4: dbColors.activityBadge4 || FALLBACK_COLORS.activityBadge4,
    activityBadge5: dbColors.activityBadge5 || FALLBACK_COLORS.activityBadge5,
    activityBadge6: dbColors.activityBadge6 || FALLBACK_COLORS.activityBadge6,
    activityBadge7: dbColors.activityBadge7 || FALLBACK_COLORS.activityBadge7,
    activityBadge8: dbColors.activityBadge8 || FALLBACK_COLORS.activityBadge8,
    activityBadge9: dbColors.activityBadge9 || FALLBACK_COLORS.activityBadge9,
    activityBadge10: dbColors.activityBadge10 || FALLBACK_COLORS.activityBadge10,
    reviewFeedbackSuccessBg: dbColors.reviewFeedbackSuccessBg || FALLBACK_COLORS.reviewFeedbackSuccessBg,
    reviewFeedbackSuccessBorder: dbColors.reviewFeedbackSuccessBorder || FALLBACK_COLORS.reviewFeedbackSuccessBorder,
    reviewFeedbackSuccessText: dbColors.reviewFeedbackSuccessText || FALLBACK_COLORS.reviewFeedbackSuccessText,
    reviewFeedbackIconBg: dbColors.reviewFeedbackIconBg || FALLBACK_COLORS.reviewFeedbackIconBg,
    reviewFeedbackIconText: dbColors.reviewFeedbackIconText || FALLBACK_COLORS.reviewFeedbackIconText,
    reviewFeedbackBadgeBg: dbColors.reviewFeedbackBadgeBg || FALLBACK_COLORS.reviewFeedbackBadgeBg,
    reviewFeedbackBadgeText: dbColors.reviewFeedbackBadgeText || FALLBACK_COLORS.reviewFeedbackBadgeText,
    reviewFeedbackErrorBg: dbColors.reviewFeedbackErrorBg || FALLBACK_COLORS.reviewFeedbackErrorBg,
    reviewFeedbackErrorBorder: dbColors.reviewFeedbackErrorBorder || FALLBACK_COLORS.reviewFeedbackErrorBorder,
    reviewFeedbackErrorText: dbColors.reviewFeedbackErrorText || FALLBACK_COLORS.reviewFeedbackErrorText,
    reviewStarActive: dbColors.reviewStarActive || FALLBACK_COLORS.reviewStarActive,
  };
}

function mergeInventoryStatusColors(
  baseColors: Record<string, string>,
  inventoryStatuses: Array<{ id: number; color: string }>
) {
  const nextColors = { ...baseColors };

  inventoryStatuses.forEach((status) => {
    if (status.id === 1) {
      nextColors.inventoryStatusInStock = status.color;
    } else if (status.id === 2) {
      nextColors.inventoryStatusLimited = status.color;
    } else if (status.id === 3) {
      nextColors.inventoryStatusLowStock = status.color;
    } else if (status.id === 4) {
      nextColors.inventoryStatusOutOfStock = status.color;
    }
  });

  return nextColors;
}

function toCssVariables(colors: Record<string, string>): CSSProperties {
  return {
    "--primary": colors.primary,
    "--secondary": colors.secondary,
    "--accent": colors.accent,
    "--dark": colors.dark,
    "--light": colors.light,
    "--background": colors.background,
    "--background-alt": colors.backgroundAlt,
    "--text": colors.text,
    "--text-muted": colors.textMuted,
    "--border": colors.border,
    "--card": colors.card,
    "--primary-rgb": colors.primaryRgb,
    "--accent-rgb": colors.accentRgb,
    "--border-rgb": colors.borderRgb,
    "--heading-font": colors.headingFont,
    "--body-font": colors.bodyFont,
    "--btn-primary-bg": colors.btnPrimaryBg,
    "--btn-primary-text": colors.btnPrimaryText,
    "--btn-primary-border": colors.btnPrimaryBorder,
    "--btn-primary-shadow": colors.btnPrimaryShadow,
    "--btn-primary-hover-bg": colors.btnPrimaryHoverBg,
    "--btn-primary-hover-text": colors.btnPrimaryHoverText,
    "--btn-primary-hover-border": colors.btnPrimaryHoverBorder,
    "--btn-primary-hover-transform": colors.btnPrimaryHoverTransform,
    "--btn-primary-hover-shadow": colors.btnPrimaryHoverShadow,
    "--btn-secondary-bg": colors.btnSecondaryBg,
    "--btn-secondary-text": colors.btnSecondaryText,
    "--btn-secondary-border": colors.btnSecondaryBorder,
    "--btn-secondary-hover-bg": colors.btnSecondaryHoverBg,
    "--btn-secondary-hover-text": colors.btnSecondaryHoverText,
    "--loading-color": colors.loadingColor,
    "--color-red": colors.colorRed,
    "--color-green": colors.colorGreen,
    "--color-blue": colors.colorBlue,
    "--color-yellow": colors.colorYellow,
    "--color-orange": colors.colorOrange,
    "--promotion-badge-bg": colors.promotionBadgeBg,
    "--promotion-badge-text": colors.promotionBadgeText,
    "--promotion-final-badge-bg": colors.promotionFinalBadgeBg,
    "--promotion-final-badge-text": colors.promotionFinalBadgeText,
    "--limited-badge-bg": colors.limitedBadgeBg,
    "--limited-badge-text": colors.limitedBadgeText,
    "--activity-badge-1": colors.activityBadge1,
    "--activity-badge-2": colors.activityBadge2,
    "--activity-badge-3": colors.activityBadge3,
    "--activity-badge-4": colors.activityBadge4,
    "--activity-badge-5": colors.activityBadge5,
    "--activity-badge-6": colors.activityBadge6,
    "--activity-badge-7": colors.activityBadge7,
    "--activity-badge-8": colors.activityBadge8,
    "--activity-badge-9": colors.activityBadge9,
    "--activity-badge-10": colors.activityBadge10,
    "--review-feedback-success-bg": colors.reviewFeedbackSuccessBg,
    "--review-feedback-success-border": colors.reviewFeedbackSuccessBorder,
    "--review-feedback-success-text": colors.reviewFeedbackSuccessText,
    "--review-feedback-icon-bg": colors.reviewFeedbackIconBg,
    "--review-feedback-icon-text": colors.reviewFeedbackIconText,
    "--review-feedback-badge-bg": colors.reviewFeedbackBadgeBg,
    "--review-feedback-badge-text": colors.reviewFeedbackBadgeText,
    "--review-feedback-error-bg": colors.reviewFeedbackErrorBg,
    "--review-feedback-error-border": colors.reviewFeedbackErrorBorder,
    "--review-feedback-error-text": colors.reviewFeedbackErrorText,
    "--review-star-active": colors.reviewStarActive,
  } as CSSProperties;
}

export async function getThemeBootstrapData(): Promise<ThemeBootstrapData> {
  try {
    const themeRows = await query("SELECT config_value FROM system_configs WHERE config_key = 'theme' LIMIT 1");
    const theme = normalizeThemeKey(themeRows.rows[0]?.config_value);

    const colorRows = await query(
      'SELECT config_key, config_value FROM theme_color_configs WHERE theme_key = ?',
      [theme]
    );

    const dbColors = colorRows.rows.reduce((acc: Record<string, string>, row: any) => {
      acc[row.config_key] = row.config_value;
      return acc;
    }, {});

    const inventoryRows = await query('SELECT id, color FROM inventory_status ORDER BY id ASC');
    const mergedColors = mergeInventoryStatusColors(convertDbToCssVars(dbColors), inventoryRows.rows as Array<{ id: number; color: string }>);

    return {
      theme,
      themeColors: mergedColors,
      cssVariables: toCssVariables(mergedColors),
    };
  } catch (error) {
    console.error('Failed to bootstrap theme data:', error);
    const theme = "chinese";
    return {
      theme,
      themeColors: FALLBACK_COLORS,
      cssVariables: toCssVariables(FALLBACK_COLORS),
    };
  }
}
