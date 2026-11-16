/** Styles for LibraryStats (the stat tiles and the reading-progress bar). */
import { StyleSheet } from "react-native";
import { font, radius, space, text, theme } from "./theme";

// The reading bar's fill, from the forest's mushroom purple into the counts' pink.
export const bloomFade = [theme.bloomDeep, theme.bloom] as const;

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
    backgroundColor: theme.bloomSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.bloomBorder,
  },
  // A soft pink glow, like the light on the mushrooms.
  count: {
    ...text.display,
    ...text.tabular,
    fontSize: font.heading,
    color: theme.bloom,
    textShadowColor: theme.bloomGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  label: { ...text.ui, fontSize: font.caption, color: theme.muted },
  progressHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: space.xs },
  progressText: { ...text.ui, fontSize: font.small, color: theme.muted, flexShrink: 1 },
  percent: { ...text.strong, ...text.tabular, fontSize: font.small, color: theme.bloom },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: theme.bloomSoft, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },
});
