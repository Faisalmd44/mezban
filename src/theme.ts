// Luxury Black + Gold + White typography
export const COLORS = {
  brand: "#C9A227",
  brandDark: "#A8841A",
  gold: "#D4AF37",
  goldLight: "#E8C96A",
  goldDark: "#9C7C16",
  black: "#0A0A0A",
  blackSoft: "#141414",
  charcoal: "#1C1C1E",
  graphite: "#242426",
  white: "#FFFFFF",
  surface: "#141414",
  surfaceAlt: "#1C1C1E",
  surfaceTint: "#2A2A2D",
  border: "#2E2E32",
  borderLight: "#3A3A3F",
  textPrimary: "#FFFFFF",
  textSecondary: "#B8B8B8",
  textMuted: "#7A7A7A",
  success: "#3DD68C",
  warning: "#F5A623",
  error: "#FF5A5F",
  veg: "#3DD68C",
  nonVeg: "#FF5A5F",
  overlay: "rgba(0,0,0,0.6)",
  goldGlow: "rgba(212,175,55,0.25)",
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const RADIUS = { xs: 4, sm: 8, md: 14, lg: 22, xl: 28, pill: 999 };

export const SHADOW = {
  card: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 6 },
  strong: { shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12 },
  gold: { shadowColor: "#D4AF37", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
};

export const FONT = { regular: "400" as const, medium: "600" as const, bold: "800" as const };

export const GRADIENTS = {
  blackFade: ["rgba(0,0,0,0)", "rgba(0,0,0,0.7)", "#0A0A0A"],
  goldFade: ["#D4AF37", "#C9A227", "#9C7C16"],
  charcoalFade: ["#1C1C1E", "#0A0A0A"],
};
