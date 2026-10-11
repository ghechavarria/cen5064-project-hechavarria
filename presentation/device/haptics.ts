/**
 * Device: Haptics — small taps of physical feedback through expo-haptics: a
 * light tick when a tab or switch changes, a soft tap for a message, a buzz when
 * something fails. Web has no vibration motor, so there every call does nothing.
 */
import * as ExpoHaptics from "expo-haptics";
import { Platform } from "react-native";

export class Haptics {
  private static readonly available = Platform.OS !== "web";

  static selection(): void {
    if (Haptics.available) {
      void ExpoHaptics.selectionAsync();
    }
  }

  static message(failed: boolean): void {
    if (!Haptics.available) {
      return;
    }
    void (failed
      ? ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error)
      : ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light));
  }
}
