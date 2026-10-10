/** Styles for BookCover (clipped art, spine highlight, icon placeholder). */
import { StyleSheet } from "react-native";
import { fillParent, radius, theme } from "./theme";

const SPINE_WIDTH = 3;

export const styles = StyleSheet.create({
  // Fills the shadowed frame and clips the art to its corners.
  inner: {
    ...fillParent,
    borderRadius: radius.sm,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  art: fillParent,
  spine: { position: "absolute", top: 0, bottom: 0, left: 0, width: SPINE_WIDTH, backgroundColor: theme.spine },
  spineShade: { position: "absolute", top: 0, bottom: 0, left: SPINE_WIDTH, width: 2, backgroundColor: theme.spineShade },
});
