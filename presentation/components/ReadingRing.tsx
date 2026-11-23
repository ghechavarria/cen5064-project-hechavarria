/**
 * Component: ReadingRing — how much of the owned shelf is read, as a ring that
 * sweeps from the forest's purple into pink, with the percentage glowing in the
 * middle. It fills when shown and when the share changes; with Reduce Motion
 * on, it simply appears at its value.
 */
import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useReducedMotion } from "../model/useReducedMotion";
import { ring, styles } from "../styles/readingRing.styles";
import { theme } from "../styles/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RADIUS = (ring.size - ring.stroke) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ReadingRing({ share }: { share: number }) {
  const reduced = useReducedMotion();
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      sweep.setValue(share);
      return;
    }
    Animated.timing(sweep, {
      toValue: share,
      duration: ring.sweepMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // an SVG stroke offset can't run on the native driver
    }).start();
  }, [share, reduced, sweep]);

  const offset = sweep.interpolate({ inputRange: [0, 1], outputRange: [CIRCUMFERENCE, 0] });
  const center = ring.size / 2;
  return (
    <View style={styles.wrap} importantForAccessibility="no-hide-descendants">
      <Svg width={ring.size} height={ring.size}>
        <Defs>
          <LinearGradient id="readSweep" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.bloomDeep} />
            <Stop offset="1" stopColor={theme.bloom} />
          </LinearGradient>
        </Defs>
        <Circle cx={center} cy={center} r={RADIUS} stroke={theme.bloomSoft} strokeWidth={ring.stroke} fill="none" />
        {share > 0 ? (
          <AnimatedCircle
            cx={center}
            cy={center}
            r={RADIUS}
            stroke="url(#readSweep)"
            strokeWidth={ring.stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={offset}
            // Start at twelve o'clock and sweep clockwise.
            transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null}
      </Svg>
      <View style={styles.center}>
        <Text style={styles.percent}>{Math.round(share * 100)}%</Text>
        <Text style={styles.caption}>read</Text>
      </View>
    </View>
  );
}
