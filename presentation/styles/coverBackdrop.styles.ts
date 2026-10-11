/** Styles for CoverBackdrop (the blurred halo behind a large cover). */
import { StyleSheet } from "react-native";
import { fillParent, theme } from "./theme";

export const backdrop = {
  blur: 28,
  // Dim the halo, then fade it into dark glass toward the bottom.
  fade: [theme.veil, theme.veilDeep, theme.glass] as const,
  // No cover: a faint mint glow instead.
  glow: [theme.selected, theme.veil, theme.glass] as const,
};

export const styles = StyleSheet.create({
  fill: fillParent,
  // Scaled up so the blur's soft edges fall outside the card.
  art: { ...fillParent, opacity: 0.85, transform: [{ scale: 1.4 }] },
});
