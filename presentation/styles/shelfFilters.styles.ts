/** Styles for ShelfFilters (To be read's slim row: Unread / Read, and the grouping button). */
import { StyleSheet } from "react-native";
import { cardSurface, font, radius, space, text, theme } from "./theme";

// Slim: 36 points tall (hitSlop makes each a 44-point target).
const HEIGHT = 36;

export const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, marginHorizontal: space.lg, marginBottom: space.md },
  // Unread / Read: one glass pill, the chosen half lit.
  switch: { ...cardSurface, flex: 1, flexDirection: "row", padding: 2, borderRadius: radius.pill },
  half: {
    flex: 1,
    minHeight: HEIGHT - 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.pill,
  },
  halfOn: { backgroundColor: theme.selected },
  label: { ...text.ui, fontSize: font.small, color: theme.muted },
  labelOn: { ...text.strong, fontSize: font.small, color: theme.glow },
  badge: { minWidth: 18, paddingHorizontal: 5, borderRadius: radius.pill, backgroundColor: theme.outline, alignItems: "center" },
  badgeOn: { backgroundColor: theme.glow },
  badgeText: { ...text.ui, ...text.tabular, fontSize: font.tiny, color: theme.muted },
  badgeTextOn: { ...text.strong, fontSize: font.tiny, color: theme.bg },
  // The grouping: a small glass pill with the sort icon and the current grouping.
  grouping: {
    ...cardSurface,
    minHeight: HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
  },
  groupingText: { ...text.ui, fontSize: font.caption, color: theme.ink },
});
