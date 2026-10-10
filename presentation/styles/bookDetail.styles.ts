/** Styles for BookDetail (cover hero, status tags, facts, about, actions). */
import { StyleSheet } from "react-native";
import { cardSurface, coverSurface, font, radius, space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  // The cover on a halo of its own colors, above the facts card.
  hero: { borderRadius: radius.xl, overflow: "hidden", alignItems: "center", paddingVertical: space.xl, marginBottom: space.md },
  cover: { ...coverSurface, width: 150, height: 225 },
  card: { ...cardSurface, borderRadius: radius.xl, padding: space.lg, gap: space.lg },
  author: { ...text.title, fontSize: font.title, color: theme.ink },
  // Status tags (Owned / Unread / Paperback): small rounded squares.
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  tag: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
    backgroundColor: theme.selected,
  },
  tagText: { ...text.strong, color: theme.glow, fontSize: font.caption },
  label: text.label,
  // Facts as a two-column list: label on the left, value on the right.
  fact: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.outline,
  },
  factLabel: { ...text.ui, color: theme.muted, fontSize: font.small },
  factValue: { ...text.strong, ...text.tabular, color: theme.ink, fontSize: font.small, flexShrink: 1, textAlign: "right" },
  body: text.body,
  subjects: { ...text.muted, fontSize: font.small, marginTop: space.sm },
  actionRow: { flexDirection: "row", gap: space.sm },
});
