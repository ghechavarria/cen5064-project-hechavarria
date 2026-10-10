/**
 * Component: Button — the one button used by screens, popups, and the camera panel.
 * Tone picks the look (primary / secondary / danger / dangerOutline); compact is the
 * popup size; fill shares a row equally with other buttons.
 */
import { Text } from "react-native";
import { ButtonTone } from "../model/promptActions";
import { boxes, styles, texts } from "../styles/button.styles";
import { Tappable } from "./Tappable";

export function Button({
  label,
  onPress,
  tone = "primary",
  compact = false,
  fill = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  compact?: boolean;
  fill?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tappable
      accessibilityRole="button"
      style={[
        styles.base,
        compact && styles.compact,
        fill && styles.fill,
        boxes[tone],
        disabled && styles.off,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, texts[tone]]}>{label}</Text>
    </Tappable>
  );
}
