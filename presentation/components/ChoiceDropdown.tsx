/**
 * Component: ChoiceDropdown — a button that opens a list you can scroll
 * through ("Gifted before"), and picks one name from it. It opens and closes
 * only when tapped, never while typing, so the popup around it stays still.
 * The name matching the field carries a check.
 */
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
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
  return (
    <View style={styles.wrap}>
      <Tappable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}: ${names.length} names`}
        onPress={() => setOpen(!open)}
        style={[styles.toggle, open && styles.toggleOpen]}
      >
        <Ionicons name="people-outline" size={icon.small} color={theme.glow} />
        <Text style={styles.toggleText}>{label}</Text>
        <Text style={styles.count}>{names.length}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={icon.small} color={theme.muted} />
      </Tappable>
      {open ? (
        <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
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
                  setOpen(false);
                }}
                style={[styles.option, on && styles.optionOn]}
              >
                <Text style={[styles.optionText, on && styles.optionTextOn]}>{name}</Text>
                {on ? <Ionicons name="checkmark" size={icon.small} color={theme.glow} /> : null}
              </Tappable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}
