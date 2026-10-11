/**
 * Component: ScanForm — type an ISBN when the camera is not an option.
 */
import { Text, View } from "react-native";
import { styles } from "../styles/scanForm.styles";
import { Button } from "./Button";
import { TextField } from "./TextField";

export function ScanForm({
  isbn,
  busy,
  onChange,
  onSubmit,
}: {
  isbn: string;
  busy: boolean;
  onChange: (isbn: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.label}>Or type the ISBN</Text>
      <TextField
        value={isbn}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder="ISBN-13 or ISBN-10"
        accessibilityLabel="ISBN"
        autoCapitalize="none"
        keyboardType="number-pad"
        returnKeyType="search"
      />
      <Button label={busy ? "Looking up…" : "Look up book"} onPress={onSubmit} disabled={busy} />
    </View>
  );
}
