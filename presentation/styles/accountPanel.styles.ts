/** Styles for AccountPanel (the sign-in forms, and the signed-in card). */
import { StyleSheet } from "react-native";
import { font, panelSurface, space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  panel: { ...panelSurface, padding: space.lg, gap: space.md },
  title: { ...text.title, fontSize: font.title, color: theme.ink },
  body: text.muted,
  email: { ...text.strong, fontSize: font.body, color: theme.ink },
  label: { ...text.label, marginBottom: 0 },
  field: { gap: space.xs },
  notice: { ...text.body, fontSize: font.small, lineHeight: 20 },
  danger: { color: theme.dangerInk },
  links: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: space.sm },
  // Text links keep a 44-point tap target.
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { ...text.ui, fontSize: font.small, color: theme.glow },
  actions: { gap: space.sm },
});
