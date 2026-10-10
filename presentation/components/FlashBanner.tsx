/**
 * Component: FlashBanner — the short message under the header (tap to dismiss).
 * The model hides it after 3 seconds; this draws it, taps the phone when it
 * appears (a buzz for errors), and has screen readers read it out.
 */
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Text } from "react-native";
import { Haptics } from "../device/haptics";
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
  useEffect(() => {
    if (flash) {
      Haptics.message(flash.tone === "danger");
    }
  }, [flash]);

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
