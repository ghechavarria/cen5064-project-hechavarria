/** Styles for ReadingRing (the read-share ring and the percentage inside it). */
import { StyleSheet } from "react-native";
import { fillParent, font, text, theme } from "./theme";

// The ring's size, stroke width, and how long its sweep takes (ms).
export const ring = { size: 104, stroke: 10, sweepMs: 900 };

export const styles = StyleSheet.create({
  wrap: { width: ring.size, height: ring.size },
  center: { ...fillParent, alignItems: "center", justifyContent: "center" },
  percent: {
    ...text.display,
    ...text.tabular,
    fontSize: font.heading,
    color: theme.bloom,
    textShadowColor: theme.bloomGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  caption: { ...text.ui, fontSize: font.caption, color: theme.muted, marginTop: -2 },
});
