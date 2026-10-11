/** Styles for IsbnCamera (permission card and live preview). */
import { Platform, StyleSheet } from "react-native";
import { fillParent, font, panelSurface, radius, space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  frame: {
    ...panelSurface,
    minHeight: 160,
    padding: space.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    marginHorizontal: space.lg,
    marginBottom: space.md,
  },
  preview: {
    position: "relative",
    height: Platform.OS === "web" ? 200 : 280,
    // No fill here. On Android the camera is a surface behind this view, so a
    // background (theme.bg, the dark blue) or a rounded clip is drawn on top of it.
    backgroundColor: "transparent",
    borderRadius: Platform.OS === "android" ? 0 : radius.xl,
    overflow: Platform.OS === "android" ? "visible" : "hidden",
    marginHorizontal: space.lg,
    marginBottom: space.md,
  },
  // Fills the preview. The camera is not measured: on web that measurement stays
  // at width 0, so the view never mounts and the dark preview covers it.
  camera: fillParent,
  reticle: { position: "absolute", left: 28, right: 28, top: "32%", height: 88, zIndex: 1 },
  // Corner brackets: two glowing edges each, rounded on the outside corner.
  corner: { position: "absolute", width: 26, height: 26, borderColor: theme.glow },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radius.md },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radius.md },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radius.md },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radius.md },
  hint: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: "center",
    color: theme.ink,
    ...text.strong,
    fontSize: font.small,
    paddingVertical: space.sm,
    backgroundColor: theme.overlay,
    zIndex: 1,
  },
  title: { ...text.title, fontSize: font.title, color: theme.ink, textAlign: "center" },
  muted: { ...text.muted, textAlign: "center" },
});
