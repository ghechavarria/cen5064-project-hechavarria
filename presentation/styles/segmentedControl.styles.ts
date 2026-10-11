/** Styles for SegmentedControl (Unread/Read and A-Z/Author/Series switches). */
import { StyleSheet } from "react-native";
import { cardSurface, font, radius, space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  segment: {
    ...cardSurface,
    flexDirection: "row",
    marginHorizontal: space.lg,
    marginBottom: space.md,
    padding: space.xs,
    borderRadius: radius.xl,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  // The chosen segment sits on the same glowing pill as the chosen menu tab.
  tabOn: { backgroundColor: theme.selected },
  text: { ...text.ui, ...text.tabular, color: theme.muted, fontSize: font.small },
  textOn: { ...text.strong, color: theme.glow },
});
