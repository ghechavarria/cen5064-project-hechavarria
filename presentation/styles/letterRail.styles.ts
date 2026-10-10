/** Styles for LetterRail (the A–Z index and its bubble). */
import { StyleSheet } from "react-native";
import { cardSurface, font, panelSurface, radius, space, text, theme } from "./theme";

// Every letter gets the same fixed slot, so the block is compact and
// AlphabetRail.letterAt can split its height evenly.
const LETTER_HEIGHT = 15;
const BUBBLE_SIZE = 44;

export const styles = StyleSheet.create({
  // Full-height, finger-wide strip that receives the touches.
  column: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  // A see-through pill behind the letters so they read over the forest art.
  backing: { ...panelSurface, borderRadius: radius.pill, paddingVertical: space.sm, width: 24 },
  // The compact block of 27 letters (the part AlphabetRail measures).
  letters: { width: "100%", alignItems: "center" },
  letter: {
    height: LETTER_HEIGHT,
    lineHeight: LETTER_HEIGHT,
    ...text.strong,
    fontSize: font.tiny,
    color: theme.ink,
    pointerEvents: "none",
  },
  letterEmpty: { color: theme.muted, opacity: 0.4 },
  letterOn: { color: theme.glow },
  bubble: {
    ...cardSurface,
    borderColor: theme.glow,
    position: "absolute",
    right: 36,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleText: { ...text.display, fontSize: font.heading, color: theme.ink },
});

// The bubble floats level with the letter under the finger.
export function bubbleAt(letterCenter: number) {
  return { top: letterCenter - BUBBLE_SIZE / 2 };
}
