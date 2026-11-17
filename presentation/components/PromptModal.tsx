/**
 * Component: PromptModal — the generic popup (title, body, optional extra
 * content, optional text input with a row of name chips under it, an optional
 * note, and a column of buttons).
 * Every popup in the app is one of these.
 */
import { ReactNode } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { PromptAction } from "../model/promptActions";
import { styles } from "../styles/promptModal.styles";
import { Button } from "./Button";
import { Tappable } from "./Tappable";
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
  // `choices`: names shown as one fixed row of chips under the field (the same
  // names in the same order while typing); tapping one fills it in, and the one
  // matching the field is lit.
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
            <View style={styles.choices}>
              <Text style={styles.choicesLabel}>{input.choices.label}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {input.choices.names.map((name) => {
                  const on = name === input.choices?.selected;
                  return (
                    <Tappable
                      key={name}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`Use ${name}`}
                      onPress={() => input.onChangeText(name)}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{name}</Text>
                    </Tappable>
                  );
                })}
              </ScrollView>
            </View>
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
