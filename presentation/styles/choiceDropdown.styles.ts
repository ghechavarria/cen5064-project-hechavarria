/** Styles for ChoiceDropdown (the toggle button and its scrolling list). */
import { StyleSheet } from "react-native";
import { font, radius, space, text, theme } from "./theme";

// Rows are 44 points tall; the list shows four and a half, so it plainly scrolls.
const ROW = 44;

export const styles = StyleSheet.create({
  wrap: { marginTop: -space.xs, marginBottom: space.sm },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: ROW,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  // Open, the toggle and the list read as one control.
  toggleOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  toggleText: { ...text.ui, fontSize: font.small, color: theme.ink, flex: 1 },
  count: { ...text.ui, ...text.tabular, fontSize: font.caption, color: theme.muted },
  list: {
    maxHeight: ROW * 4.5,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.border,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    backgroundColor: theme.surface,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: ROW,
    paddingHorizontal: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.outline,
  },
  optionOn: { backgroundColor: theme.selected },
  optionText: { ...text.ui, fontSize: font.body, color: theme.ink },
  optionTextOn: { color: theme.glow },
});
