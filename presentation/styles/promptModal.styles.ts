/** Styles for PromptModal (centered popup sheet). */
import { StyleSheet } from "react-native";
import {
  fillParent,
  font,
  radius,
  softShadow,
  space,
  text,
  theme,
} from "./theme";

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: "center",
    padding: space.xl,
  },
  // Where sheets meet: the arriving one sets the size, a leaving one floats over it.
  stage: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    justifyContent: "center",
  },
  leaving: { ...fillParent, justifyContent: "center" },
  // The glow behind a sheet as it arrives.
  halo: {
    ...fillParent,
    margin: -space.lg,
    borderRadius: radius.xl + space.lg,
    backgroundColor: theme.glowSoft,
  },
  // Solid, unlike the glass cards, so the screen behind never shows through the text.
  sheet: {
    backgroundColor: theme.night,
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
  title: {
    ...text.title,
    fontSize: font.heading,
    color: theme.ink,
    textAlign: "center",
  },
  body: { ...text.muted, marginBottom: space.xs, textAlign: "center" },
  input: { marginVertical: space.sm },
  // Room for two lines, kept even when empty, so the buttons below don't jump.
  note: {
    ...text.muted,
    fontSize: font.small,
    textAlign: "center",
    minHeight: 40,
    marginBottom: space.xs,
  },
});

// The sheet's inner padding, so a child can bleed edge to edge across it.
export const sheetPadding = space.xl;
