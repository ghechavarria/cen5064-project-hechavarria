/**
 * Component: EmptyShelf — the "nothing here yet" card for TBR, Wanted, and the Owned catalog.
 */
import { Ionicons } from "@expo/vector-icons";
import { ComponentProps } from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";
import { styles } from "../styles/emptyShelf.styles";
import { icon, theme } from "../styles/theme";
import { Button } from "./Button";

export function EmptyShelf({
  iconName,
  title,
  message,
  action,
  style,
}: {
  iconName: ComponentProps<typeof Ionicons>["name"];
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.empty, style]}>
      <View style={styles.ring} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Ionicons name={iconName} size={icon.hero} color={theme.glow} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action ? <Button label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}
