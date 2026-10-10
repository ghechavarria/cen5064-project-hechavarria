/** Styles for EmptyShelf (the empty-list card). */
import { StyleSheet } from "react-native";
import { font, panelSurface, radius, space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  empty: {
    ...panelSurface,
    padding: space.xl,
    alignItems: "center",
    gap: space.sm,
  },
  // The icon sits in a softly glowing ring.
  ring: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: theme.selected,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xs,
  },
  title: { ...text.title, fontSize: font.heading, color: theme.ink },
  message: { ...text.muted, textAlign: "center" },
});
