"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from "react";

type ThemeKey = "chinese" | "middleEastern" | "amazon" | "middleEasternLuxury";

interface ThemeContextType {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  themeColors: Record<string, string>;
}

interface ThemeApiResponse {
  theme?: string;
}

interface ThemeColorsApiResponse {
  success?: boolean;
  data?: Record<string, Record<string, string>>;
}

interface InventoryStatusItem {
  id: number;
  color: string;
}

interface InventoryStatusApiResponse {
  success?: boolean;
  data?: InventoryStatusItem[];
}

interface ResolvedThemeData {
  theme: ThemeKey;
  themeColors: Record<string, string>;
}

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeKey;
  initialThemeColors?: Record<string, string>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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
};

let cachedThemeData: ResolvedThemeData | null = null;
let themeBootstrapPromise: Promise<ResolvedThemeData | null> | null = null;

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
  inventoryStatusData: InventoryStatusApiResponse | null
) {
  if (!inventoryStatusData?.success || !Array.isArray(inventoryStatusData.data)) {
    return baseColors;
  }

  const nextColors = { ...baseColors };

  inventoryStatusData.data.forEach((status) => {
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

function isSameThemeColors(a: Record<string, string>, b: Record<string, string>) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function fetchThemeBundle(themeOverride?: ThemeKey): Promise<ResolvedThemeData | null> {
  const themeResponse = themeOverride
    ? ({ theme: themeOverride } as ThemeApiResponse)
    : await fetch("/api/themes").then(async (response) => (response.ok ? response.json() : null));

  const nextTheme = normalizeThemeKey(themeResponse?.theme);
  const [colorsData, inventoryStatusData] = await Promise.all([
    fetch(`/api/theme-colors?theme=${nextTheme}`).then(async (response) =>
      response.ok ? ((await response.json()) as ThemeColorsApiResponse) : null
    ),
    fetch("/api/inventory-status").then(async (response) =>
      response.ok ? ((await response.json()) as InventoryStatusApiResponse) : null
    ),
  ]);

  const dbColors = colorsData?.success && colorsData.data?.[nextTheme] ? colorsData.data[nextTheme] : {};
  const convertedColors = convertDbToCssVars(dbColors);
  const mergedColors = mergeInventoryStatusColors(convertedColors, inventoryStatusData);

  return {
    theme: nextTheme,
    themeColors: mergedColors,
  };
}

async function getInitialThemeData() {
  if (cachedThemeData) {
    return cachedThemeData;
  }

  if (!themeBootstrapPromise) {
    themeBootstrapPromise = fetchThemeBundle()
      .then((data) => {
        if (data) {
          cachedThemeData = data;
        }
        return data;
      })
      .finally(() => {
        themeBootstrapPromise = null;
      });
  }

  return themeBootstrapPromise;
}

function updateCSSVariables(colors: Record<string, string>) {
  const root = document.documentElement;

  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--secondary", colors.secondary);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--dark", colors.dark);
  root.style.setProperty("--light", colors.light);
  root.style.setProperty("--background", colors.background);
  root.style.setProperty("--background-alt", colors.backgroundAlt);
  root.style.setProperty("--text", colors.text);
  root.style.setProperty("--text-muted", colors.textMuted);
  root.style.setProperty("--border", colors.border);
  root.style.setProperty("--card", colors.card);
  root.style.setProperty("--primary-rgb", colors.primaryRgb);
  root.style.setProperty("--accent-rgb", colors.accentRgb);
  root.style.setProperty("--border-rgb", colors.borderRgb);
  root.style.setProperty("--heading-font", colors.headingFont);
  root.style.setProperty("--body-font", colors.bodyFont);
  root.style.setProperty("--btn-primary-bg", colors.btnPrimaryBg);
  root.style.setProperty("--btn-primary-text", colors.btnPrimaryText);
  root.style.setProperty("--btn-primary-border", colors.btnPrimaryBorder);
  root.style.setProperty("--btn-primary-shadow", colors.btnPrimaryShadow);
  root.style.setProperty("--btn-primary-hover-bg", colors.btnPrimaryHoverBg);
  root.style.setProperty("--btn-primary-hover-text", colors.btnPrimaryHoverText);
  root.style.setProperty("--btn-primary-hover-border", colors.btnPrimaryHoverBorder);
  root.style.setProperty("--btn-primary-hover-transform", colors.btnPrimaryHoverTransform);
  root.style.setProperty("--btn-primary-hover-shadow", colors.btnPrimaryHoverShadow);
  root.style.setProperty("--btn-secondary-bg", colors.btnSecondaryBg);
  root.style.setProperty("--btn-secondary-text", colors.btnSecondaryText);
  root.style.setProperty("--btn-secondary-border", colors.btnSecondaryBorder);
  root.style.setProperty("--btn-secondary-hover-bg", colors.btnSecondaryHoverBg);
  root.style.setProperty("--btn-secondary-hover-text", colors.btnSecondaryHoverText);
  root.style.setProperty("--loading-color", colors.loadingColor);
  root.style.setProperty("--color-red", colors.colorRed);
  root.style.setProperty("--color-green", colors.colorGreen);
  root.style.setProperty("--color-blue", colors.colorBlue);
  root.style.setProperty("--color-yellow", colors.colorYellow);
  root.style.setProperty("--color-orange", colors.colorOrange);
  root.style.setProperty("--promotion-badge-bg", colors.promotionBadgeBg);
  root.style.setProperty("--promotion-badge-text", colors.promotionBadgeText);
  root.style.setProperty("--promotion-final-badge-bg", colors.promotionFinalBadgeBg);
  root.style.setProperty("--promotion-final-badge-text", colors.promotionFinalBadgeText);
  root.style.setProperty("--limited-badge-bg", colors.limitedBadgeBg);
  root.style.setProperty("--limited-badge-text", colors.limitedBadgeText);
  root.style.setProperty("--activity-badge-1", colors.activityBadge1);
  root.style.setProperty("--activity-badge-2", colors.activityBadge2);
  root.style.setProperty("--activity-badge-3", colors.activityBadge3);
  root.style.setProperty("--activity-badge-4", colors.activityBadge4);
  root.style.setProperty("--activity-badge-5", colors.activityBadge5);
  root.style.setProperty("--activity-badge-6", colors.activityBadge6);
  root.style.setProperty("--activity-badge-7", colors.activityBadge7);
  root.style.setProperty("--activity-badge-8", colors.activityBadge8);
  root.style.setProperty("--activity-badge-9", colors.activityBadge9);
  root.style.setProperty("--activity-badge-10", colors.activityBadge10);
  root.style.setProperty("--review-feedback-success-bg", colors.reviewFeedbackSuccessBg);
  root.style.setProperty("--review-feedback-success-border", colors.reviewFeedbackSuccessBorder);
  root.style.setProperty("--review-feedback-success-text", colors.reviewFeedbackSuccessText);
  root.style.setProperty("--review-feedback-icon-bg", colors.reviewFeedbackIconBg);
  root.style.setProperty("--review-feedback-icon-text", colors.reviewFeedbackIconText);
  root.style.setProperty("--review-feedback-badge-bg", colors.reviewFeedbackBadgeBg);
  root.style.setProperty("--review-feedback-badge-text", colors.reviewFeedbackBadgeText);
  root.style.setProperty("--review-feedback-error-bg", colors.reviewFeedbackErrorBg);
  root.style.setProperty("--review-feedback-error-border", colors.reviewFeedbackErrorBorder);
  root.style.setProperty("--review-feedback-error-text", colors.reviewFeedbackErrorText);
  root.style.setProperty("--review-star-active", colors.reviewStarActive);
}

export function ThemeProvider({
  children,
  initialTheme,
  initialThemeColors,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeKey>(initialTheme || cachedThemeData?.theme || "chinese");
  const [themeColors, setThemeColors] = useState<Record<string, string>>(initialThemeColors || cachedThemeData?.themeColors || FALLBACK_COLORS);
  const hasInitializedRef = useRef(false);
  const appliedThemeSnapshotRef = useRef("");

  useEffect(() => {
    if (initialTheme && initialThemeColors) {
      const initialData = { theme: initialTheme, themeColors: initialThemeColors };
      cachedThemeData = initialData;
    }
  }, [initialTheme, initialThemeColors]);

  const applyThemeData = useCallback((data: ResolvedThemeData | null) => {
    if (!data) {
      return;
    }

    setTheme((currentTheme) => (currentTheme === data.theme ? currentTheme : data.theme));
    setThemeColors((currentColors) => (isSameThemeColors(currentColors, data.themeColors) ? currentColors : data.themeColors));
  }, []);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    let isActive = true;

    getInitialThemeData()
      .then((data) => {
        if (!isActive) {
          return;
        }
        applyThemeData(data);
      })
      .catch((error) => {
        console.error("Failed to fetch theme data:", error);
      });

    return () => {
      isActive = false;
    };
  }, [applyThemeData]);

  useEffect(() => {
    const snapshot = JSON.stringify(themeColors);
    if (appliedThemeSnapshotRef.current === snapshot) {
      return;
    }
    appliedThemeSnapshotRef.current = snapshot;
    updateCSSVariables(themeColors);
  }, [themeColors]);

  const handleSetTheme = async (newTheme: ThemeKey) => {
    try {
      const response = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      });

      if (!response.ok) {
        return;
      }

      const nextData = await fetchThemeBundle(newTheme);
      if (!nextData) {
        return;
      }

      cachedThemeData = nextData;
      applyThemeData(nextData);
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, themeColors }}>
      <div className={`theme-${theme}`}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
