/** Styles for MenuBar (the floating tab dock, its sliding pill, and the Scan circle). */
import { Animated, StyleSheet } from "react-native";
import { font, radius, softShadow, space, text, theme } from "./theme";

// The dock's inner padding; the sliding pill sits inside it.
const INSET = space.xs;

export const styles = StyleSheet.create({
  // Transparent strip that keeps the dock off the screen edges.
  bar: { paddingHorizontal: space.lg, paddingTop: space.sm },
  dock: {
    flexDirection: "row",
    padding: INSET,
    borderRadius: radius.xl,
    backgroundColor: theme.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.outline,
    ...softShadow,
  },
  // The pill under the chosen tab, with a short mint bar along its top edge.
  indicator: {
    position: "absolute",
    top: INSET,
    bottom: INSET,
    left: 0,
    borderRadius: radius.lg,
    backgroundColor: theme.selected,
    alignItems: "center",
  },
  indicatorBar: { width: 20, height: 3, borderRadius: radius.pill, backgroundColor: theme.glow },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    gap: 3,
    borderRadius: radius.lg,
  },
  // Scan, the main action, in a filled mint circle like the primary buttons.
  primaryIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: theme.glow,
    alignItems: "center",
    justifyContent: "center",
    ...softShadow,
  },
  label: { ...text.ui, fontSize: font.tiny, color: theme.muted, letterSpacing: 0.2 },
  labelOn: { ...text.strong, color: theme.glow },
});

// Each tab's width: the dock's inner width shared equally.
export function tabWidthIn(dockWidth: number, tabCount: number) {
  return (dockWidth - INSET * 2) / tabCount;
}

// The pill is one tab wide and slides to the chosen tab's slot.
export function indicatorAt(position: Animated.Value, tabWidth: number) {
  return {
    width: tabWidth,
    transform: [{ translateX: Animated.add(Animated.multiply(position, tabWidth), INSET) }],
  };
}

// Clear the home indicator, with at least 10px of breathing room.
export function barBottom(bottomInset: number) {
  return { paddingBottom: Math.max(bottomInset, 10) };
}
