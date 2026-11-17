/** Styles for ShelfFilters (To be read's row: Unread / Read, and the grouping button). */
import { StyleSheet } from "react-native";
import { cardSurface, font, radius, space, text, theme } from "./theme";

// As thick as the other switches: 44-point halves inside 4 points of padding.
const TAB = 44;
const INSET = space.xs;

export const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, marginHorizontal: space.lg, marginBottom: space.md },
  // Unread / Read: one glass bar, the chosen half lit (the same shape as SegmentedControl).
  switch: { ...cardSurface, flex: 1, flexDirection: "row", padding: INSET, borderRadius: radius.xl },
  half: {
    flex: 1,
    minHeight: TAB,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.lg,
  },
  halfOn: { backgroundColor: theme.selected },
  label: { ...text.ui, fontSize: font.small, color: theme.muted },
  labelOn: { ...text.strong, fontSize: font.small, color: theme.glow },
  badge: { minWidth: 18, paddingHorizontal: 5, borderRadius: radius.pill, backgroundColor: theme.outline, alignItems: "center" },
  badgeOn: { backgroundColor: theme.glow },
  badgeText: { ...text.ui, ...text.tabular, fontSize: font.tiny, color: theme.muted },
  badgeTextOn: { ...text.strong, fontSize: font.tiny, color: theme.bg },
  // The grouping: a glass button as tall as the switch, with the sort icon and the current grouping.
  grouping: {
    ...cardSurface,
    minHeight: TAB + INSET * 2,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.xl,
  },
  groupingText: { ...text.ui, fontSize: font.small, color: theme.ink },
});
