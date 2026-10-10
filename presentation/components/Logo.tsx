/**
 * Component: Logo — the MyHomeLib lockup: a glowing library mark in a rounded
 * tile, then the wordmark in Outfit SemiBold. Small in the header, large on
 * the loading screen.
 */
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { logoSizes, styles } from "../styles/logo.styles";
import { theme } from "../styles/theme";

export function Logo({ size = "small" }: { size?: keyof typeof logoSizes }) {
  const { tile, glyph, word } = logoSizes[size];
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="MyHomeLib">
      <View style={[styles.tile, tile]}>
        <Ionicons name="library" size={glyph} color={theme.glow} />
      </View>
      <Text style={[styles.word, word]}>MyHomeLib</Text>
    </View>
  );
}
