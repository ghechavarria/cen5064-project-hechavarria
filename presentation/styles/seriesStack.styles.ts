/** Styles for SeriesStack (one card: fanned covers on a halo, then the series name). */
import { StyleSheet } from "react-native";
import { cardSurface, coverSurface, font, radius, softShadow, space, text, theme } from "./theme";

// Cover fan geometry, shared with the component so the math and the look agree.
export const FAN = { coverWidth: 72, step: 28, maxCovers: 5 };

export const styles = StyleSheet.create({
  wrap: { ...cardSurface, marginBottom: space.md, borderRadius: radius.xl, overflow: "hidden" },
  hero: { alignItems: "center", paddingTop: space.lg, paddingBottom: space.sm },
  fan: { height: 118, alignSelf: "center" },
  spine: { position: "absolute", top: space.sm, ...softShadow },
  cover: { ...coverSurface, width: FAN.coverWidth, height: 108 },
  badge: {
    position: "absolute",
    top: 0,
    right: -space.sm,
    minWidth: 28,
    height: 28,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    backgroundColor: theme.glow,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  badgeText: { ...text.strong, ...text.tabular, color: theme.bg, fontSize: font.small },
  plaque: { paddingVertical: space.md, paddingHorizontal: space.lg },
  name: { ...text.title, fontSize: font.title, color: theme.ink, textAlign: "center" },
});

// The fan is as wide as its covers; each cover sits FAN.step right of the one before.
export function fanWidth(coverCount: number) {
  return { width: FAN.coverWidth + FAN.step * (coverCount - 1) };
}

export function spineAt(index: number) {
  return { left: index * FAN.step, zIndex: 10 - index };
}
