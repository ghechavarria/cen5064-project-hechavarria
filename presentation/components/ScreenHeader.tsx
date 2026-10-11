/**
 * Component: ScreenHeader — the masthead of every screen: the MyHomeLib logo
 * (or a round Back button on a book), the big title, the hint line, and a
 * fading mint rule that separates it from the content.
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import { headerRule, headerTop, styles } from "../styles/screenHeader.styles";
import { icon, theme } from "../styles/theme";
import { Logo } from "./Logo";
import { Tappable } from "./Tappable";

export function ScreenHeader({
  heading,
  hint,
  topInset,
  onBack,
}: {
  heading: string;
  hint: string | null;
  topInset: number;
  onBack?: () => void;
}) {
  return (
    <View style={[styles.header, headerTop(topInset)]}>
      <View style={styles.top}>
        {onBack ? (
          <Tappable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.back}>
            <Ionicons name="chevron-back" size={icon.medium} color={theme.ink} />
          </Tappable>
        ) : (
          <Logo />
        )}
      </View>
      <Text style={[styles.h1, onBack && styles.h1Book]} numberOfLines={onBack ? 3 : undefined} accessibilityRole="header">
        {heading}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <LinearGradient colors={headerRule} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.rule} />
    </View>
  );
}
