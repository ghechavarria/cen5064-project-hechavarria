/** Styles for AccountPanel (the sign-in forms, and the signed-in card). */
import { StyleSheet } from "react-native";
import { font, panelSurface, radius, space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  panel: { ...panelSurface, padding: space.lg, gap: space.md },
  title: { ...text.title, fontSize: font.title, color: theme.ink },
  body: text.muted,
  // The library at a glance: four tiles in a row, a big count over a small label.
  stats: { flexDirection: "row", gap: space.sm },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: space.xs,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: theme.selected,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  statCount: { ...text.display, ...text.tabular, fontSize: font.heading, color: theme.glow },
  statLabel: { ...text.ui, fontSize: font.caption, color: theme.muted },
  // Details as a two-column list, like a book's facts: label left, value right.
  detail: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.outline,
  },
  detailLabel: { ...text.ui, color: theme.muted, fontSize: font.small },
  detailValue: { ...text.strong, color: theme.ink, fontSize: font.small, flexShrink: 1, textAlign: "right" },
  label: { ...text.label, marginBottom: 0 },
  field: { gap: space.xs },
  notice: { ...text.body, fontSize: font.small, lineHeight: 20 },
  danger: { color: theme.dangerInk },
  links: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: space.sm },
  // Text links keep a 44-point tap target.
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { ...text.ui, fontSize: font.small, color: theme.glow },
  actions: { gap: space.sm },
});
