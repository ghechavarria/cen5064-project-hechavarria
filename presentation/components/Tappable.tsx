/**
 * Component: Tappable — the one pressable surface every button, card and tab
 * is built on, so each tap gets its platform's own feedback: a ripple on
 * Android, a quick spring press-in on iOS and web.
 */
import { useRef } from "react";
import { Animated, GestureResponderEvent, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import { focusRing, pressScale, pressScaleEnabled, pressSpring, ripple, rippleClip } from "../styles/feedback.styles";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Tappable({
  style,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle> }) {
  const scale = useRef(new Animated.Value(1)).current;

  // Springs toward the target and passes the event on to any caller handler.
  const springTo = (target: typeof pressSpring.in, handler?: (event: GestureResponderEvent) => void) =>
    (event: GestureResponderEvent) => {
      if (pressScaleEnabled) {
        Animated.spring(scale, target).start();
      }
      handler?.(event);
    };

  return (
    <AnimatedPressable
      android_ripple={ripple}
      onPressIn={springTo(pressSpring.in, onPressIn ?? undefined)}
      onPressOut={springTo(pressSpring.out, onPressOut ?? undefined)}
      style={[style, rippleClip, focusRing, pressScale(scale)]}
      {...props}
    />
  );
}
