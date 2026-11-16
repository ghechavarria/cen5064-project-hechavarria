/**
 * Component: PromptModal — the generic popup (title, body, optional extra
 * content, optional text input with a dropdown of suggestions, and a column of buttons).
 * Every popup in the app is one of these.
 */
import { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, View } from "react-native";
import { PromptAction } from "../model/promptActions";
import { styles } from "../styles/promptModal.styles";
import { icon, theme } from "../styles/theme";
import { Button } from "./Button";
import { Tappable } from "./Tappable";
import { TextField } from "./TextField";

export function PromptModal({
  visible,
  title,
  body,
  input,
  actions,
  onRequestClose,
  children,
}: {
  visible: boolean;
  title: string;
  body?: string;
  // `suggestions` list under the field like a dropdown; tapping one fills it in.
  input?: { placeholder: string; value: string; onChangeText: (text: string) => void; suggestions?: string[] };
  actions: PromptAction[];
  onRequestClose: () => void;
  children?: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
          {children}
          {input ? (
            <TextField
              style={styles.input}
              value={input.value}
              onChangeText={input.onChangeText}
              placeholder={input.placeholder}
              autoFocus
            />
          ) : null}
          {input?.suggestions?.length ? (
            <View style={styles.dropdown} accessibilityLabel="Names used before">
              {input.suggestions.map((name) => (
                <Tappable
                  key={name}
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${name}`}
                  onPress={() => input.onChangeText(name)}
                  style={styles.option}
                >
                  <Ionicons name="person-outline" size={icon.small} color={theme.glow} />
                  <Text style={styles.optionText}>{name}</Text>
                </Tappable>
              ))}
            </View>
          ) : null}
          {actions.map((action) => (
            <Button key={action.label} compact {...action} />
          ))}
        </View>
      </View>
    </Modal>
  );
}
