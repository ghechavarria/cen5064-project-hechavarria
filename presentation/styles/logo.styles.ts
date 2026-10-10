/** Styles for Logo (mark tile + wordmark, in two sizes). */
import { StyleSheet } from "react-native";
import { font, radius, softShadow, space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.selected,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glow,
    ...softShadow,
  },
  word: { ...text.strong, color: theme.ink, letterSpacing: -0.2 },
});

// Tile, glyph and wordmark scale together.
export const logoSizes = {
  small: {
    tile: { width: 26, height: 26, borderRadius: radius.sm },
    glyph: 14,
    word: { fontSize: font.button },
  },
  large: {
    tile: { width: 64, height: 64, borderRadius: radius.lg },
    glyph: 34,
    word: { fontSize: font.heading },
  },
};
