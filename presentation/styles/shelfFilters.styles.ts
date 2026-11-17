/** Styles for ShelfFilters (To be read's grouping options and Unread / Read, in one panel). */
import { StyleSheet } from "react-native";
import { cardSurface, font, radius, space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  panel: {
    ...cardSurface,
    marginHorizontal: space.lg,
    marginBottom: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.xl,
  },
  // Grouping: a quiet label, then small text options; the chosen one on a soft pill.
  groupRow: { flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: 36, paddingHorizontal: space.xs },
  groupLabel: { ...text.ui, fontSize: font.tiny, color: theme.muted, marginRight: space.xs, letterSpacing: 0.3 },
  groupOption: { paddingHorizontal: space.md, minHeight: 28, justifyContent: "center", borderRadius: radius.pill },
  groupOptionOn: { backgroundColor: theme.selected },
  groupText: { ...text.ui, fontSize: font.caption, color: theme.muted },
  groupTextOn: { ...text.strong, fontSize: font.caption, color: theme.glow },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.outline, marginHorizontal: space.xs },
  // Unread / Read: two halves, each with its count in a small badge.
  readingRow: { flexDirection: "row", gap: space.xs, paddingTop: space.xs },
  readingOption: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.lg,
  },
  readingOptionOn: { backgroundColor: theme.selected },
  readingText: { ...text.ui, fontSize: font.small, color: theme.muted },
  readingTextOn: { ...text.strong, fontSize: font.small, color: theme.glow },
  badge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: theme.outline,
    alignItems: "center",
  },
  badgeOn: { backgroundColor: theme.glow },
  badgeText: { ...text.ui, ...text.tabular, fontSize: font.tiny, color: theme.muted },
  badgeTextOn: { ...text.strong, fontSize: font.tiny, color: theme.bg },
});
