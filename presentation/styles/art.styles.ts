/** Styles for Art / ArtFill (image wrappers and the forest's top and bottom fades). */
import { StyleSheet } from "react-native";
import { fillParent } from "./theme";

// How long a newly loaded image takes to fade in, in ms.
export const imageFade = 200;

export const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  fill: { ...fillParent, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  scrimTop: { position: "absolute", top: 0, left: 0, right: 0, height: "34%" },
  scrimBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: "28%" },
});
