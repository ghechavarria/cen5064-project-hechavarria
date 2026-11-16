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
  // Names used before, listed under the field like a dropdown.
  dropdown: {
    marginTop: -space.xs,
    marginBottom: space.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.outline,
  },
  optionText: { ...text.ui, fontSize: font.body, color: theme.ink },
});

// The sheet's inner padding, so a child can bleed edge to edge across it.
export const sheetPadding = space.xl;
