/** Styles for ScreenHeader (logo or Back, big title, hint, fading rule). */
import { StyleSheet } from "react-native";
import { font, radius, space, text, theme } from "./theme";

// The divider under the header: mint at the left, fading out to the right.
export const headerRule = [theme.glowSoft, theme.clear] as const;

export const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: space.md, zIndex: 1 },
  top: { minHeight: 44, justifyContent: "center", marginBottom: space.md },
  // Round glass Back button, the size of a tap target.
  back: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: theme.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  // Main titles: big, bold and tight, with a faint mint halo.
  h1: {
    ...text.display,
    fontSize: font.display + 2,
    lineHeight: font.display + 6,
    letterSpacing: -1.4,
    color: theme.ink,
    textShadowColor: theme.glowSoft,
    textShadowRadius: 16,
  },
  // Book titles can be long, so they wrap at a smaller size and are capped at
  // three lines; capping clips the text box, so they go without the halo.
  h1Book: { fontSize: font.display - 8, lineHeight: font.display - 2, letterSpacing: -0.8, textShadowRadius: 0 },
  hint: { ...text.ui, color: theme.muted, fontSize: font.small + 1, marginTop: space.xs },
  rule: { height: 1, marginTop: space.md },
});

// Header starts just below the status bar / notch.
export function headerTop(topInset: number) {
  return { paddingTop: topInset + space.xs };
}
