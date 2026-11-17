/**
 * Component: PromptModal — the generic popup (title, body, optional extra
 * content, optional text input with a dropdown of names under it, an optional
 * note, and a column of buttons).
 * Every popup in the app is one of these.
 */
import { ReactNode } from "react";
import { Modal, Text, View } from "react-native";
import { PromptAction } from "../model/promptActions";
import { styles } from "../styles/promptModal.styles";
import { Button } from "./Button";
import { ChoiceDropdown } from "./ChoiceDropdown";
import { TextField } from "./TextField";

export function PromptModal({
  visible,
  title,
  body,
  input,
  note,
  actions,
  onRequestClose,
  children,
}: {
  visible: boolean;
  title: string;
  body?: string;
  // `choices`: names in a dropdown under the field that opens only when tapped
  // (so nothing moves while typing); picking one fills it in, and the one
  // matching the field is checked.
  input?: {
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    choices?: { label: string; names: string[]; selected: string | null };
  };
  // A line under the field that explains what the main button will do.
  note?: string;
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
          {input?.choices && input.choices.names.length > 0 ? (
            <ChoiceDropdown
              label={input.choices.label}
              names={input.choices.names}
              selected={input.choices.selected}
              onPick={input.onChangeText}
            />
          ) : null}
          {note !== undefined ? (
            <Text style={styles.note} accessibilityLiveRegion="polite">
              {note}
            </Text>
          ) : null}
          {actions.map((action) => (
            <Button key={action.label} compact {...action} />
          ))}
        </View>
      </View>
    </Modal>
  );
}
