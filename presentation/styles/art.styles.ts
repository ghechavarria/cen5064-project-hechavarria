/** Styles for Art / ArtFill (image wrappers and the forest's top and bottom fades). */
import { Platform, StyleSheet } from "react-native";
import { fillParent } from "./theme";

// How long a newly loaded image takes to fade in, in ms.
export const imageFade = 200;

// Blur radius for the forest behind every screen: browser only (see ArtFill).
export const forestBlur = Platform.OS === "web" ? 2 : undefined;

export const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  fill: { ...fillParent, overflow: "hidden" },
  blurredFill: { transform: [{ scale: 1.06 }] },
  image: { width: "100%", height: "100%" },
  scrimTop: { position: "absolute", top: 0, left: 0, right: 0, height: "34%" },
  scrimBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: "28%" },
});
