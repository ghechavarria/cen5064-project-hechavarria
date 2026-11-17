/**
 * Component: SegmentedControl — a row of tabs with one selected.
 * Reused for TBR's Unread / Read and the catalogs' A–Z / Author / Series.
 * `small` is a thinner, quieter version (To be read's grouping, above Unread / Read);
 * its hitSlop keeps each segment a 44-point target.
 */
import { Ionicons } from "@expo/vector-icons";
import { ComponentProps } from "react";
import { Text, View } from "react-native";
import { styles } from "../styles/segmentedControl.styles";
import { icon, theme } from "../styles/theme";
import { Tappable } from "./Tappable";

type Segment<Key extends string> = {
  key: Key;
  label: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
};

export function SegmentedControl<Key extends string>({
  segments,
  selected,
  onSelect,
  size = "regular",
}: {
  segments: Segment<Key>[];
  selected: Key;
  onSelect: (key: Key) => void;
  size?: "regular" | "small";
}) {
  const small = size === "small";
  return (
    <View style={[styles.segment, small && styles.segmentSmall]}>
      {segments.map((segment) => (
        <Tappable
          key={segment.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: segment.key === selected }}
          style={[styles.tab, small && styles.tabSmall, segment.key === selected && styles.tabOn]}
          hitSlop={small ? { top: 6, bottom: 6 } : undefined}
          onPress={() => {
            if (segment.key !== selected) {
              onSelect(segment.key);
            }
          }}
        >
          {segment.icon ? <Ionicons name={segment.icon} size={icon.small} color={theme.glow} /> : null}
          <Text style={[styles.text, small && styles.textSmall, segment.key === selected && styles.textOn]}>
            {segment.label}
          </Text>
        </Tappable>
      ))}
    </View>
  );
}
