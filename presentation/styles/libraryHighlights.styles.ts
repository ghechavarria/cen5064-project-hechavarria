/** Styles for LibraryHighlights (pages, genres, gifts and the latest addition). */
import { StyleSheet } from "react-native";
import { coverSurface, font, radius, space, text, theme } from "./theme";

// The pages bar fills like the reading ring: purple into pink.
export const readFade = [theme.bloomDeep, theme.bloom] as const;

export const styles = StyleSheet.create({
  list: { gap: space.xs },
  row: {
    gap: space.sm,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.outline,
  },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  title: { ...text.ui, fontSize: font.small, color: theme.muted, flex: 1 },
  value: { ...text.strong, ...text.tabular, fontSize: font.small, color: theme.ink, textAlign: "right", flexShrink: 1 },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: theme.bloomSoft, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  chip: {
    ...text.ui,
    fontSize: font.caption,
    color: theme.ink,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: theme.bloomSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.bloom,
    overflow: "hidden",
  },
  latest: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm, minHeight: 44 },
  cover: { ...coverSurface, width: 36, height: 54 },
  latestText: { flex: 1, gap: 2 },
  bookTitle: { ...text.strong, fontSize: font.body, color: theme.ink },
  added: { ...text.ui, fontSize: font.caption, color: theme.muted },
});
