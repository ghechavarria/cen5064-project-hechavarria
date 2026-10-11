/** Styles for BookCard (one row in a list). */
import { StyleSheet } from "react-native";
import { cardSurface, coverSurface, font, radius, space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  wrap: {
    ...cardSurface,
    marginBottom: space.md,
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    paddingVertical: space.md,
    paddingLeft: space.md,
    paddingRight: space.sm,
    borderRadius: radius.lg,
  },
  cover: { ...coverSurface, width: 60, height: 90 },
  body: { flex: 1, gap: 3 },
  title: { ...text.title, fontSize: font.title - 1, color: theme.ink },
  author: { ...text.ui, color: theme.muted, fontSize: font.small },
  meta: { ...text.ui, ...text.tabular, color: theme.muted, fontSize: font.caption, marginTop: 2 },
  // Right edge: the read leaf (if any) above the "opens" chevron.
  trail: { alignItems: "center", justifyContent: "center", gap: space.sm, minWidth: 28 },
});
