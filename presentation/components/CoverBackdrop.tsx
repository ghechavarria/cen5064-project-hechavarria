/**
 * Component: CoverBackdrop — a book's cover blown up, blurred and dimmed into a
 * soft halo of its own colors, fading into the card below. With no cover it
 * falls back to a faint mint glow. Sits behind covers shown large.
 */
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { backdrop, styles } from "../styles/coverBackdrop.styles";
import { Art } from "./Art";

export function CoverBackdrop({ uri }: { uri: string }) {
  return (
    <View pointerEvents="none" style={styles.fill}>
      {uri ? <Art source={{ uri }} blur={backdrop.blur} style={styles.art} /> : null}
      <LinearGradient colors={uri ? backdrop.fade : backdrop.glow} style={styles.fill} />
    </View>
  );
}
