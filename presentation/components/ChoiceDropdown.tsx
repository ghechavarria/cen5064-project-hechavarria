/**
 * Component: ChoiceDropdown — a button that opens a list you can scroll
 * through ("Gifted before"), and picks one name from it. It opens and closes
 * only when tapped, never while typing, so the popup around it stays still.
 * Opening, the list fades and slides in while what is below eases down; with
 * Reduce Motion on, it simply appears. The name matching the field carries a check.
 */
import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useReducedMotion } from "../model/useReducedMotion";
import {
  chevronTurnStyle,
  listEntrance,
  listEntranceStyle,
} from "../styles/feedback.styles";
import { styles } from "../styles/choiceDropdown.styles";
import { icon, theme } from "../styles/theme";
import { Tappable } from "./Tappable";

export function ChoiceDropdown({
  label,
  names,
  selected,
  onPick,
}: {
  label: string;
  names: string[];
  selected: string | null;
  onPick: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const turn = useRef(new Animated.Value(0)).current;
  // What sits below (the note and the buttons) eases to its new place instead of jumping.
  const toggle = (next: boolean) => {
    if (!reduced) {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          listEntrance.duration,
          "easeInEaseOut",
          "opacity",
        ),
      );
    }
    setOpen(next);
    if (reduced) {
      turn.setValue(next ? 1 : 0);
    } else {
      Animated.timing(turn, { toValue: next ? 1 : 0, ...listEntrance }).start();
    }
  };
  return (
    <View style={styles.wrap}>
      <Tappable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}: ${names.length} names`}
        onPress={() => toggle(!open)}
        style={[styles.toggle, open && styles.toggleOpen]}
      >
        <Ionicons name="people-outline" size={icon.small} color={theme.glow} />
        <Text style={styles.toggleText}>{label}</Text>
        <Text style={styles.count}>{names.length}</Text>
        <Animated.View style={chevronTurnStyle(turn)}>
          <Ionicons name="chevron-down" size={icon.small} color={theme.muted} />
        </Animated.View>
      </Tappable>
      {open ? (
        <SlideIn reduced={reduced}>
          <ScrollView
            style={styles.list}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {names.map((name) => {
              const on = name === selected;
              return (
                <Tappable
                  key={name}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Use ${name}`}
                  onPress={() => {
                    onPick(name);
                    toggle(false);
                  }}
                  style={[styles.option, on && styles.optionOn]}
                >
                  <Text style={[styles.optionText, on && styles.optionTextOn]}>
                    {name}
                  </Text>
                  {on ? (
                    <Ionicons
                      name="checkmark"
                      size={icon.small}
                      color={theme.glow}
                    />
                  ) : null}
                </Tappable>
              );
            })}
          </ScrollView>
        </SlideIn>
      ) : null}
    </View>
  );
}

// The list fades in as it slides down into place.
function SlideIn({
  reduced,
  children,
}: {
  reduced: boolean;
  children: ReactNode;
}) {
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (!reduced) {
      Animated.timing(progress, { toValue: 1, ...listEntrance }).start();
    }
  }, [progress, reduced]);
  return (
    <Animated.View style={listEntranceStyle(progress)}>
      {children}
    </Animated.View>
  );
}
