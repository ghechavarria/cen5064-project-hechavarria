/** Styles for ScanForm (typed-ISBN fallback, in its own panel). */
import { StyleSheet } from "react-native";
import { panelSurface, space, text } from "./theme";

export const styles = StyleSheet.create({
  panel: { ...panelSurface, padding: space.lg },
  label: text.label,
});
