/**
 * Component: PromptModal — the generic popup (title, body, optional extra
 * content, optional text input, and a column of buttons).
 * Every popup in the app is one of these.
 */
import { ReactNode } from "react";
import { Modal, Text, View } from "react-native";
import { PromptAction } from "../model/promptActions";
import { styles } from "../styles/promptModal.styles";
import { Button } from "./Button";
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
  input?: { placeholder: string; value: string; onChangeText: (text: string) => void };
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
          {actions.map((action) => (
            <Button key={action.label} compact {...action} />
          ))}
        </View>
      </View>
    </Modal>
  );
}
