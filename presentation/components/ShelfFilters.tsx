/**
 * Component: ShelfFilters — To be read's filters in one slim row: Unread / Read
 * as a switch (a count badge each, the leaf by Read), and beside it a small
 * button showing how the list is grouped; tapping it moves to the next grouping
 * (A–Z → Author → Series → A–Z). Every option keeps a 44-point tap target.
 */
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { ReadingStatus } from "../../domain";
import { CatalogMode } from "../model/catalog";
import { styles } from "../styles/shelfFilters.styles";
import { icon, theme } from "../styles/theme";
import { Tappable } from "./Tappable";

type Grouping = { key: CatalogMode; label: string };
type Reading = { key: ReadingStatus; label: string; count: number; read: boolean };

export function ShelfFilters({
  groupings,
  grouping,
  onGrouping,
  readings,
  reading,
  onReading,
}: {
  groupings: Grouping[];
  grouping: CatalogMode;
  onGrouping: (mode: CatalogMode) => void;
  readings: Reading[];
  reading: ReadingStatus;
  onReading: (status: ReadingStatus) => void;
}) {
  const at = Math.max(0, groupings.findIndex((option) => option.key === grouping));
  const current = groupings[at];
  const next = groupings[(at + 1) % groupings.length];
  return (
    <View style={styles.row}>
      <View style={styles.switch} accessibilityRole="tablist">
        {readings.map((option) => {
          const on = option.key === reading;
          return (
            <Tappable
              key={option.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${option.label}, ${option.count}`}
              hitSlop={{ top: 4, bottom: 4 }}
              onPress={() => !on && onReading(option.key)}
              style={[styles.half, on && styles.halfOn]}
            >
              {option.read ? <Ionicons name="leaf-outline" size={icon.small} color={on ? theme.glow : theme.muted} /> : null}
              <Text style={[styles.label, on && styles.labelOn]}>{option.label}</Text>
              <View style={[styles.badge, on && styles.badgeOn]}>
                <Text style={[styles.badgeText, on && styles.badgeTextOn]}>{option.count}</Text>
              </View>
            </Tappable>
          );
        })}
      </View>
      <Tappable
        accessibilityRole="button"
        accessibilityLabel={`Grouped by ${current.label}. Tap for ${next.label}`}
        hitSlop={{ top: 4, bottom: 4 }}
        onPress={() => onGrouping(next.key)}
        style={styles.grouping}
      >
        <Ionicons name="swap-vertical" size={icon.small} color={theme.glow} />
        <Text style={styles.groupingText}>{current.label}</Text>
      </Tappable>
    </View>
  );
}
