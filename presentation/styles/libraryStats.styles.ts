/** Styles for LibraryStats (the stat tiles and the reading-progress bar). */
import { StyleSheet } from "react-native";
import { font, radius, space, text, theme } from "./theme";

// The reading bar's fill, from the forest's mushroom purple into pink.
export const bloomFade = [theme.bloomDeep, theme.bloom] as const;

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
  wrap: { gap: space.md },
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
  progressHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: space.xs },
  progressText: { ...text.ui, fontSize: font.small, color: theme.muted, flexShrink: 1 },
  percent: { ...text.strong, ...text.tabular, fontSize: font.small, color: theme.bloom },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: theme.bloomSoft, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },
});
