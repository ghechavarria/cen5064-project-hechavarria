/**
 * Component: Reveal — lets a list item fade and rise into place, a little after
 * the item above it. Stands still when the phone asks for reduced motion.
 */
import { ReactNode, useEffect, useRef } from "react";
import { Animated } from "react-native";
import { useReducedMotion } from "../model/useReducedMotion";
import { reveal, revealStyle } from "../styles/feedback.styles";

export function Reveal({ index, children }: { index: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: reveal.duration,
      delay: Math.min(index, reveal.maxStaggered) * reveal.stagger,
      useNativeDriver: reveal.useNativeDriver,
    }).start();
  }, [index, progress, reduced]);

  return <Animated.View style={revealStyle(progress)}>{children}</Animated.View>;
}
