export const COLORS = {
  brand: "#B71C1C",
  brandDark: "#8B1010",
  gold: "#F4C430",
  goldDark: "#D9A800",
  black: "#121212",
  white: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#F7F7F7",
  surfaceTint: "#FFEBEE",
  border: "#E5E5E5",
  textPrimary: "#121212",
  textSecondary: "#6B6B6B",
  textMuted: "#9A9A9A",
  success: "#2E7D32",
  warning: "#F57C00",
  error: "#D32F2F",
  veg: "#2E7D32",
  nonVeg: "#B71C1C",
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const RADIUS = { sm: 6, md: 12, lg: 20, pill: 999 };
export const SHADOW = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  strong: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const FONT = { regular: "400" as const, medium: "600" as const, bold: "800" as const };
