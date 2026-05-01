"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type ThemeKey = "chinese" | "middleEastern" | "amazon" | "middleEasternLuxury";

interface ThemeContextType {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  themeColors: Record<string, string>;
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeKey>("chinese");
  const [themeColors, setThemeColors] = useState<Record<string, string>>(FALLBACK_COLORS);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);

    const fetchThemeData = async () => {
      try {
        const response = await fetch("/api/themes");
        if (response.ok) {
          const data = await response.json();
          const themeFromDb = data.theme || "chinese";

          if (VALID_THEMES.includes(themeFromDb as ThemeKey)) {
            setTheme(themeFromDb as ThemeKey);
          }

          const colorsResponse = await fetch(`/api/theme-colors?theme=${themeFromDb}`);
          if (colorsResponse.ok) {
            const colorsData = await colorsResponse.json();
            if (colorsData.success && colorsData.data[themeFromDb]) {
              const dbColors = colorsData.data[themeFromDb];
              const convertedColors = convertDbToCssVars(dbColors);

              const inventoryStatusResponse = await fetch("/api/inventory-status");
              if (inventoryStatusResponse.ok) {
                const inventoryStatusData = await inventoryStatusResponse.json();
                if (inventoryStatusData.success) {
                  inventoryStatusData.data.forEach((status: any) => {
                    if (status.id === 1) {
                      convertedColors.inventoryStatusInStock = status.color;
                    } else if (status.id === 2) {
                      convertedColors.inventoryStatusLimited = status.color;
                    } else if (status.id === 3) {
                      convertedColors.inventoryStatusLowStock = status.color;
                    } else if (status.id === 4) {
                      convertedColors.inventoryStatusOutOfStock = status.color;
                    }
                  });
                }
              }

              setThemeColors(convertedColors);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch theme data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThemeData();
  }, []);

  useEffect(() => {
    if (isClient) {
      updateCSSVariables(themeColors);
    }
  }, [themeColors, isClient]);

  const convertDbToCssVars = (dbColors: Record<string, string>): Record<string, string> => {
    const cssVars: Record<string, string> = {};

    cssVars.primary = dbColors.primary || FALLBACK_COLORS.primary;
    cssVars.secondary = dbColors.secondary || FALLBACK_COLORS.secondary;
    cssVars.accent = dbColors.accent || FALLBACK_COLORS.accent;
    cssVars.dark = dbColors.dark || FALLBACK_COLORS.dark;
    cssVars.light = dbColors.light || FALLBACK_COLORS.light;
    cssVars.background = dbColors.background || FALLBACK_COLORS.background;
    cssVars.backgroundAlt = dbColors.backgroundAlt || FALLBACK_COLORS.backgroundAlt;
    cssVars.text = dbColors.text || FALLBACK_COLORS.text;
    cssVars.textMuted = dbColors.textMuted || FALLBACK_COLORS.textMuted;
    cssVars.border = dbColors.border || FALLBACK_COLORS.border;
    cssVars.card = dbColors.card || FALLBACK_COLORS.card;
    cssVars.primaryRgb = dbColors.primaryRgb || FALLBACK_COLORS.primaryRgb;
    cssVars.accentRgb = dbColors.accentRgb || FALLBACK_COLORS.accentRgb;
    cssVars.borderRgb = dbColors.borderRgb || FALLBACK_COLORS.borderRgb;
    cssVars.headingFont = dbColors["heading-font"] || FALLBACK_COLORS.headingFont;
    cssVars.bodyFont = dbColors["body-font"] || FALLBACK_COLORS.bodyFont;
    cssVars.colorRed = dbColors.colorRed || FALLBACK_COLORS.colorRed;
    cssVars.colorGreen = dbColors.colorGreen || FALLBACK_COLORS.colorGreen;
    cssVars.colorBlue = dbColors.colorBlue || FALLBACK_COLORS.colorBlue;
    cssVars.colorYellow = dbColors.colorYellow || FALLBACK_COLORS.colorYellow;
    cssVars.colorOrange = dbColors.colorOrange || FALLBACK_COLORS.colorOrange;
    cssVars.btnPrimaryBg = dbColors["btn-primary-bg"] || FALLBACK_COLORS.btnPrimaryBg;
    cssVars.btnPrimaryText = dbColors["btn-primary-text"] || FALLBACK_COLORS.btnPrimaryText;
    cssVars.btnPrimaryBorder = dbColors["btn-primary-border"] || FALLBACK_COLORS.btnPrimaryBorder;
    cssVars.btnPrimaryShadow = dbColors["btn-primary-shadow"] || FALLBACK_COLORS.btnPrimaryShadow;
    cssVars.btnPrimaryHoverBg = dbColors["btn-primary-hover-bg"] || FALLBACK_COLORS.btnPrimaryHoverBg;
    cssVars.btnPrimaryHoverText = dbColors["btn-primary-hover-text"] || FALLBACK_COLORS.btnPrimaryHoverText;
    cssVars.btnPrimaryHoverBorder = dbColors["btn-primary-hover-border"] || FALLBACK_COLORS.btnPrimaryHoverBorder;
    cssVars.btnPrimaryHoverTransform = dbColors["btn-primary-hover-transform"] || FALLBACK_COLORS.btnPrimaryHoverTransform;
    cssVars.btnPrimaryHoverShadow = dbColors["btn-primary-hover-shadow"] || FALLBACK_COLORS.btnPrimaryHoverShadow;
    cssVars.btnSecondaryBg = dbColors["btn-secondary-bg"] || FALLBACK_COLORS.btnSecondaryBg;
    cssVars.btnSecondaryText = dbColors["btn-secondary-text"] || FALLBACK_COLORS.btnSecondaryText;
    cssVars.btnSecondaryBorder = dbColors["btn-secondary-border"] || FALLBACK_COLORS.btnSecondaryBorder;
    cssVars.btnSecondaryHoverBg = dbColors["btn-secondary-hover-bg"] || FALLBACK_COLORS.btnSecondaryHoverBg;
    cssVars.btnSecondaryHoverText = dbColors["btn-secondary-hover-text"] || FALLBACK_COLORS.btnSecondaryHoverText;
    cssVars.loadingColor = dbColors["loading-color"] || FALLBACK_COLORS.loadingColor;
    cssVars.inventoryStatusInStock = dbColors.inventoryStatus_inStock || FALLBACK_COLORS.inventoryStatusInStock;
    cssVars.inventoryStatusLimited = dbColors.inventoryStatus_limited || FALLBACK_COLORS.inventoryStatusLimited;
    cssVars.inventoryStatusLowStock = dbColors.inventoryStatus_lowStock || FALLBACK_COLORS.inventoryStatusLowStock;
    cssVars.inventoryStatusOutOfStock = dbColors.inventoryStatus_outOfStock || FALLBACK_COLORS.inventoryStatusOutOfStock;
    cssVars.promotionBadgeBg = dbColors.promotionBadgeBg || FALLBACK_COLORS.promotionBadgeBg;
    cssVars.promotionBadgeText = dbColors.promotionBadgeText || FALLBACK_COLORS.promotionBadgeText;
    cssVars.promotionFinalBadgeBg = dbColors.promotionFinalBadgeBg || FALLBACK_COLORS.promotionFinalBadgeBg;
    cssVars.promotionFinalBadgeText = dbColors.promotionFinalBadgeText || FALLBACK_COLORS.promotionFinalBadgeText;
    cssVars.limitedBadgeBg = dbColors.limitedBadgeBg || FALLBACK_COLORS.limitedBadgeBg;
    cssVars.limitedBadgeText = dbColors.limitedBadgeText || FALLBACK_COLORS.limitedBadgeText;
    cssVars.activityBadge1 = dbColors.activityBadge1 || FALLBACK_COLORS.activityBadge1;
    cssVars.activityBadge2 = dbColors.activityBadge2 || FALLBACK_COLORS.activityBadge2;
    cssVars.activityBadge3 = dbColors.activityBadge3 || FALLBACK_COLORS.activityBadge3;
    cssVars.activityBadge4 = dbColors.activityBadge4 || FALLBACK_COLORS.activityBadge4;
    cssVars.activityBadge5 = dbColors.activityBadge5 || FALLBACK_COLORS.activityBadge5;
    cssVars.activityBadge6 = dbColors.activityBadge6 || FALLBACK_COLORS.activityBadge6;
    cssVars.activityBadge7 = dbColors.activityBadge7 || FALLBACK_COLORS.activityBadge7;
    cssVars.activityBadge8 = dbColors.activityBadge8 || FALLBACK_COLORS.activityBadge8;
    cssVars.activityBadge9 = dbColors.activityBadge9 || FALLBACK_COLORS.activityBadge9;
    cssVars.activityBadge10 = dbColors.activityBadge10 || FALLBACK_COLORS.activityBadge10;

    return cssVars;
  };

  const updateCSSVariables = (colors: Record<string, string>) => {
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
  };

  const handleSetTheme = async (newTheme: ThemeKey) => {
    try {
      const response = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      });

      if (response.ok) {
        setTheme(newTheme);

        const colorsResponse = await fetch(`/api/theme-colors?theme=${newTheme}`);
        if (colorsResponse.ok) {
          const colorsData = await colorsResponse.json();
          if (colorsData.success && colorsData.data[newTheme]) {
            const dbColors = colorsData.data[newTheme];
            const convertedColors = convertDbToCssVars(dbColors);

            const inventoryStatusResponse = await fetch("/api/inventory-status");
            if (inventoryStatusResponse.ok) {
              const inventoryStatusData = await inventoryStatusResponse.json();
              if (inventoryStatusData.success) {
                inventoryStatusData.data.forEach((status: any) => {
                  if (status.id === 1) {
                    convertedColors.inventoryStatusInStock = status.color;
                  } else if (status.id === 2) {
                    convertedColors.inventoryStatusLimited = status.color;
                  } else if (status.id === 3) {
                    convertedColors.inventoryStatusLowStock = status.color;
                  } else if (status.id === 4) {
                    convertedColors.inventoryStatusOutOfStock = status.color;
                  }
                });
              }
            }

            const badgeColors = {
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
            };
            Object.assign(convertedColors, badgeColors);

            setThemeColors(convertedColors);
          }
        }
      }
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  };

  const LoadingSpinner = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-gray-300 border-t-[var(--loading-color)] rounded-full animate-spin"></div>
    </div>
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, themeColors }}>
      <div className={`theme-${theme}`}>
        {children}
      </div>
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
