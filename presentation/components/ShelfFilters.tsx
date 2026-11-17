/**
 * Component: ShelfFilters — To be read's filters, as one quiet panel: how the
 * list is grouped (A–Z / Author / Series, small text options with the chosen
 * one on a soft pill), then a hairline, then Unread / Read with a count badge
 * each (Read with its leaf). Every option keeps a 44-point tap target.
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
  return (
    <View style={styles.panel}>
      <View style={styles.groupRow} accessibilityRole="tablist">
        <Text style={styles.groupLabel}>Group</Text>
        {groupings.map((option) => {
          const on = option.key === grouping;
          return (
            <Tappable
              key={option.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Group by ${option.label}`}
              hitSlop={{ top: 8, bottom: 8 }}
              onPress={() => !on && onGrouping(option.key)}
              style={[styles.groupOption, on && styles.groupOptionOn]}
            >
              <Text style={[styles.groupText, on && styles.groupTextOn]}>{option.label}</Text>
            </Tappable>
          );
        })}
      </View>
      <View style={styles.rule} />
      <View style={styles.readingRow} accessibilityRole="tablist">
        {readings.map((option) => {
          const on = option.key === reading;
          return (
            <Tappable
              key={option.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${option.label}, ${option.count}`}
              onPress={() => !on && onReading(option.key)}
              style={[styles.readingOption, on && styles.readingOptionOn]}
            >
              {option.read ? <Ionicons name="leaf-outline" size={icon.small} color={on ? theme.glow : theme.muted} /> : null}
              <Text style={[styles.readingText, on && styles.readingTextOn]}>{option.label}</Text>
              <View style={[styles.badge, on && styles.badgeOn]}>
                <Text style={[styles.badgeText, on && styles.badgeTextOn]}>{option.count}</Text>
              </View>
            </Tappable>
          );
        })}
      </View>
    </View>
  );
}
