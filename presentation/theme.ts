/**
 * Presentation: dark forest colors and glow shadow.
 * Must not call fetch or SQL.
 */
import { Platform } from "react-native";

export const theme = {
  bg: "#050E1C",
  bgRaised: "#0C1A2E",
  card: "#12243C",
  ink: "#E8F0F4",
  muted: "#B7C9D6",
  gold: "#C9D6E0",
  moss: "#2E6B6A",
  mossBright: "#7EF0E0",
  pine: "#0C1A2E",
  danger: "#C45C4A",
  border: "#7EF0E0",
  glow: "#7EF0E0",
  overlay: "rgba(5,14,28,0.78)",
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" }) as string,
};

export const glowShadow = {
  shadowColor: theme.glow,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.85,
  shadowRadius: 16,
  elevation: 12,
};
