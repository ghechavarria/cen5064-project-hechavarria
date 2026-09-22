/**
 * Presentation: TBR / Owned / Wanted / Scan tab bar.
 * Must not call fetch or SQL.
 */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Art } from "./Art";
import { glowShadow, theme } from "./theme";

export type MenuTab = "tbr" | "owned" | "wanted" | "scan";

const TABS: {
  id: MenuTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOn: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "tbr", label: "TBR", icon: "bookmark-outline", iconOn: "bookmark" },
  { id: "owned", label: "Owned", icon: "library-outline", iconOn: "library" },
  { id: "wanted", label: "Wanted", icon: "heart-outline", iconOn: "heart" },
  { id: "scan", label: "Scan", icon: "barcode-outline", iconOn: "barcode" },
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
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <View pointerEvents="none" style={styles.vine}>
        <Art
          source={require("../assets/wood-nav-strip.png")}
          resizeMode="cover"
          style={styles.vineArt}
        />
      </View>
      {TABS.map((tab) => (
        <Pressable
          key={tab.id}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === tab.id }}
          onPress={() => onSelect(tab.id)}
          style={styles.item}
        >
          <Ionicons
            name={active === tab.id ? tab.iconOn : tab.icon}
            size={22}
            color={active === tab.id ? theme.glow : theme.muted}
          />
          <Text style={[styles.label, active === tab.id && styles.labelOn]}>{tab.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    paddingTop: 26,
    paddingHorizontal: 8,
    overflow: "hidden",
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.glow,
    ...glowShadow,
  },
  vine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 22,
    overflow: "hidden",
  },
  vineArt: {
    width: "100%",
    height: "100%",
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    gap: 2,
    zIndex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.muted,
    letterSpacing: 0.2,
  },
  labelOn: {
    color: theme.ink,
    textShadowColor: theme.glow,
    textShadowRadius: 8,
  },
});
