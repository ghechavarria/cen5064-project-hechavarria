/**
 * Styles for Button: one base shape plus one box style and one text style per tone.
 */
import { StyleSheet } from "react-native";
import { font, radius, softShadow, space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  base: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    marginTop: space.md,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  compact: { marginTop: space.sm, minHeight: 48 },
  // Share a row equally with other buttons.
  fill: { flex: 1 },
  off: { opacity: 0.6 },
  text: { ...text.strong, fontSize: font.button, letterSpacing: 0.1, textAlign: "center" },
});

export const boxes = StyleSheet.create({
  primary: { backgroundColor: theme.glow, ...softShadow },
  secondary: { backgroundColor: theme.selected, borderWidth: 1, borderColor: theme.border },
  danger: { backgroundColor: theme.danger },
  dangerOutline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: theme.dangerInk },
});

export const texts = StyleSheet.create({
  primary: { color: theme.bg },
  secondary: { color: theme.glow },
  danger: { color: theme.ink },
  dangerOutline: { color: theme.dangerInk },
});
