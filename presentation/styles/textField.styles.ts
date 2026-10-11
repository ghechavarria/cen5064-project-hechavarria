/** Styles for TextField (resting edge, and the mint ring while focused). */
import { StyleSheet } from "react-native";
import { font, radius, space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    ...text.ui,
    fontSize: font.button,
    backgroundColor: theme.surface,
    color: theme.ink,
  },
  // Web draws its own focus outline; tint it mint to match the border.
  focused: { borderColor: theme.glow, backgroundColor: theme.card, outlineColor: theme.glow },
});
