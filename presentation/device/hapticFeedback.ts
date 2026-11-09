/**
 * Device: HapticFeedback — Feedback on a phone, through expo-haptics: a light
 * tick when a tab or switch changes, a soft tap for a message, a buzz when
 * something fails. Part of PhoneDevices; the browser build uses SilentFeedback.
 */
import * as ExpoHaptics from "expo-haptics";
import { Feedback } from "../model/devices";

export class HapticFeedback implements Feedback {
  selection(): void {
    void ExpoHaptics.selectionAsync();
  }

  message(failed: boolean): void {
    void (failed
      ? ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error)
      : ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light));
  }
}
