/**
 * Component: FlashBanner — the short message under the header (tap to dismiss).
 * The model hides it after 3 seconds (and gives the haptic tap or buzz when it
 * appears); this draws it and has screen readers read it out.
 */
import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import { FlashTone } from "../model/libraryAppModel";
import { styles } from "../styles/flashBanner.styles";
import { icon, theme } from "../styles/theme";
import { Tappable } from "./Tappable";

export function FlashBanner({
  flash,
  onDismiss,
}: {
  flash: { text: string; tone: FlashTone } | null;
  onDismiss: () => void;
}) {
  if (!flash) {
    return null;
  }
  const danger = flash.tone === "danger";
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityHint="Dismisses the message"
      accessibilityLiveRegion="polite"
      onPress={onDismiss}
      style={[styles.flash, danger && styles.danger]}
    >
      <Ionicons
        name={danger ? "alert-circle" : "checkmark-circle"}
        size={icon.medium}
        color={danger ? theme.dangerInk : theme.glow}
      />
      <Text style={styles.text}>{flash.text}</Text>
      <Ionicons name="close" size={icon.small} color={theme.muted} />
    </Tappable>
  );
}
