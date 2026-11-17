/**
 * Component: Logo — the MyHomeLib lockup: a glowing library mark in a rounded
 * tile, then the wordmark in Outfit SemiBold. Small in the header, large on
 * the loading screen. `systemFont` is for the loading screen while Outfit is
 * still loading: text laid out in the fallback font and then drawn in Outfit
 * (which is wider) loses its last letter ("MyHomeLi").
 */
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { logoSizes, styles } from "../styles/logo.styles";
import { theme } from "../styles/theme";

export function Logo({
  size = "small",
  systemFont = false,
}: {
  size?: keyof typeof logoSizes;
  systemFont?: boolean;
}) {
  const { tile, glyph, word } = logoSizes[size];
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="MyHomeLib">
      <View style={[styles.tile, tile]}>
        <Ionicons name="library" size={glyph} color={theme.glow} />
      </View>
      <Text style={[styles.word, word, systemFont && styles.systemWord]}>MyHomeLib</Text>
    </View>
  );
}
