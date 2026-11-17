/** Styles for PromptModal (centered popup sheet). */
import { StyleSheet } from "react-native";
import { font, radius, softShadow, space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: "center",
    padding: space.xl,
  },
  // Solid, unlike the glass cards, so the screen behind never shows through the text.
  sheet: {
    backgroundColor: theme.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.outline,
    ...softShadow,
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.sm,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    overflow: "hidden",
  },
  title: { ...text.title, fontSize: font.heading, color: theme.ink, textAlign: "center" },
  body: { ...text.muted, marginBottom: space.xs, textAlign: "center" },
  input: { marginVertical: space.sm },
  // Names used before: one row of chips that scrolls sideways, so its height never changes.
  choices: { gap: space.xs, marginTop: -space.xs, marginBottom: space.sm },
  choicesLabel: { ...text.ui, fontSize: font.caption, color: theme.muted },
  chipRow: { gap: space.sm },
  chip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  chipOn: { backgroundColor: theme.selected, borderColor: theme.glow },
  chipText: { ...text.ui, fontSize: font.small, color: theme.ink },
  chipTextOn: { color: theme.glow },
  // Room for two lines, kept even when empty, so the buttons below don't jump.
  note: { ...text.muted, fontSize: font.small, textAlign: "center", minHeight: 40, marginBottom: space.xs },
});

// The sheet's inner padding, so a child can bleed edge to edge across it.
export const sheetPadding = space.xl;
