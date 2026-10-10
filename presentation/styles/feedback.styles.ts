/**
 * Shared motion and touch feedback. Android answers a tap with a ripple (kept
 * inside the rounded corners); iOS and web spring the surface in slightly
 * (0.96, the native-feeling amount). Lists rise into place with a short stagger.
 */
import { Animated, Platform, StyleSheet } from "react-native";
import { theme } from "./theme";

const android = Platform.OS === "android";

// The web build has no native animation driver.
const useNativeDriver = Platform.OS !== "web";

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  // Keyboard focus ring (web): mint instead of the browser's default color.
  focusRing: { outlineColor: theme.glow },
});

export const focusRing = styles.focusRing;

export const ripple = { color: theme.selected };

// Clipping only on Android, so iOS glow shadows aren't cut off.
export const rippleClip = android ? styles.clip : null;

// Android already shows the ripple, so it gets no press-in on top.
export const pressScaleEnabled = !android;

/** Spring targets for a press: quick in, a touch softer on release. */
export const pressSpring = {
  in: { toValue: 0.96, speed: 40, bounciness: 0, useNativeDriver },
  out: { toValue: 1, speed: 24, bounciness: 6, useNativeDriver },
};

/** The nav pill gliding to a newly chosen tab: quick, with a slight settle. */
export const slideSpring = { speed: 16, bounciness: 5, useNativeDriver };

/** Entrance: each card fades and rises a little after the one above it. */
export const reveal = {
  rise: 10,
  duration: 260,
  stagger: 45,
  maxStaggered: 8, // later cards share the last delay so long lists don't lag
  useNativeDriver,
};

export function pressScale(scale: Animated.Value) {
  return { transform: [{ scale }] };
}

export function revealStyle(progress: Animated.Value) {
  return {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [reveal.rise, 0] }) }],
  };
}
