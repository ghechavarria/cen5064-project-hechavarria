/** Styles for LibraryStats (the reading ring's row and the stat tiles). */
import { StyleSheet } from "react-native";
import { font, radius, space, text, theme } from "./theme";

/**
 * One color per tile, all taken from the forest art: teal moss, pink and violet
 * mushrooms, and the blue of the night sky. A tile is tinted glass, lit at the
 * top in its color and fading into the night; its count glows in that color.
 */
const tone = (color: string, rgb: string) => ({
  color,
  glass: [`rgba(${rgb},0.26)`, `rgba(${rgb},0.04)`] as const,
  edge: `rgba(${rgb},0.55)`,
  glow: `rgba(${rgb},0.7)`,
});

export const statTones = {
  owned: tone(theme.glow, "126,240,224"),
  toRead: tone(theme.bloom, "255,154,213"),
  read: tone("#D3B0FF", "190,146,250"),
  wanted: tone("#9CCBFF", "140,190,255"),
};

export const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  hero: { flexDirection: "row", alignItems: "center", gap: space.lg },
  heroText: { flex: 1, gap: space.xs },
  headline: { ...text.display, ...text.tabular, fontSize: font.heading, color: theme.ink },
  note: { ...text.muted, fontSize: font.small },
  tiles: { flexDirection: "row", gap: space.sm },
  tile: {
    flex: 1,
    alignItems: "center",
    gap: space.xs,
    paddingTop: space.sm,
    paddingBottom: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  // Glowing like the light on the mushrooms; color and glow come from the tile's tone.
  count: {
    ...text.display,
    ...text.tabular,
    fontSize: font.heading,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  label: { ...text.ui, fontSize: font.caption, color: theme.ink },
});
