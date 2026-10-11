/**
 * Component: MenuBar — the floating TBR / Owned / Wanted / Scan tab dock.
 * A glowing pill slides under the chosen tab (it simply jumps there when the
 * phone asks for reduced motion). Scan, the app's main action, sits in a mint circle.
 */
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { Haptics } from "../device/haptics";
import { MenuTab } from "../model/libraryAppModel";
import { useReducedMotion } from "../model/useReducedMotion";
import { slideSpring } from "../styles/feedback.styles";
import { barBottom, indicatorAt, styles, tabWidthIn } from "../styles/menuBar.styles";
import { icon, theme } from "../styles/theme";
import { Tappable } from "./Tappable";

type IconName = keyof typeof Ionicons.glyphMap;

// One entry per tab: outline icon when idle, filled icon when selected.
const TABS: { id: MenuTab; label: string; icon: IconName; iconOn: IconName; primary?: true }[] = [
  { id: "tbr", label: "TBR", icon: "bookmark-outline", iconOn: "bookmark" },
  { id: "owned", label: "Owned", icon: "library-outline", iconOn: "library" },
  { id: "wanted", label: "Wanted", icon: "heart-outline", iconOn: "heart" },
  { id: "scan", label: "Scan", icon: "barcode-outline", iconOn: "barcode", primary: true },
];

export function MenuBar({
  active,
  bottomInset,
  onSelect,
}: {
  active: MenuTab;
  bottomInset: number;
  onSelect: (tab: MenuTab) => void;
}) {
  const index = TABS.findIndex((tab) => tab.id === active);
  const reduced = useReducedMotion();
  const position = useRef(new Animated.Value(index)).current;
  const [tabWidth, setTabWidth] = useState(0);

  // Slide the pill to the chosen tab.
  useEffect(() => {
    if (reduced) {
      position.setValue(index);
    } else {
      Animated.spring(position, { toValue: index, ...slideSpring }).start();
    }
  }, [index, position, reduced]);

  return (
    <View style={[styles.bar, barBottom(bottomInset)]}>
      <View
        style={styles.dock}
        onLayout={(event) => setTabWidth(tabWidthIn(event.nativeEvent.layout.width, TABS.length))}
      >
        {tabWidth > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.indicator, indicatorAt(position, tabWidth)]}>
            <View style={styles.indicatorBar} />
          </Animated.View>
        ) : null}
        {TABS.map((tab) => {
          const on = active === tab.id;
          return (
            <Tappable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: on }}
              onPress={() => {
                if (!on) {
                  Haptics.selection();
                }
                onSelect(tab.id);
              }}
              style={styles.item}
            >
              <View style={tab.primary ? styles.primaryIcon : null}>
                <Ionicons
                  name={on ? tab.iconOn : tab.icon}
                  size={icon.large}
                  color={tab.primary ? theme.bg : on ? theme.glow : theme.muted}
                />
              </View>
              <Text style={[styles.label, on && styles.labelOn]}>{tab.label}</Text>
            </Tappable>
          );
        })}
      </View>
    </View>
  );
}
