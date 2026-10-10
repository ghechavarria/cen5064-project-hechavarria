/** Styles for FlashBanner (a card with a glowing edge; a red edge for errors). */
import { StyleSheet } from "react-native";
import { cardSurface, font, radius, space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  flash: {
    ...cardSurface,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderLeftWidth: 4,
    borderLeftColor: theme.glow,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
  text: { ...text.ui, flex: 1, color: theme.ink, fontSize: font.small + 1 },
  danger: { borderColor: theme.dangerInk, borderLeftColor: theme.dangerInk },
});
