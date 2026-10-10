/**
 * Component: SegmentedControl — a row of tabs with one selected.
 * Reused for TBR's Unread / Read and the Owned catalog's A–Z / Author / Series.
 */
import { Ionicons } from "@expo/vector-icons";
import { ComponentProps } from "react";
import { Text, View } from "react-native";
import { Haptics } from "../device/haptics";
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
}: {
  segments: Segment<Key>[];
  selected: Key;
  onSelect: (key: Key) => void;
}) {
  return (
    <View style={styles.segment}>
      {segments.map((segment) => (
        <Tappable
          key={segment.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: segment.key === selected }}
          style={[styles.tab, segment.key === selected && styles.tabOn]}
          onPress={() => {
            if (segment.key !== selected) {
              Haptics.selection();
              onSelect(segment.key);
            }
          }}
        >
          {segment.icon ? <Ionicons name={segment.icon} size={icon.small} color={theme.glow} /> : null}
          <Text style={[styles.text, segment.key === selected && styles.textOn]}>
            {segment.label}
          </Text>
        </Tappable>
      ))}
    </View>
  );
}
