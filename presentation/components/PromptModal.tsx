/**
 * Components: PromptHost and PromptModal — every popup in the app.
 *
 * PromptHost is the one Modal and its dark overlay, open while any popup is.
 * PromptModal is a popup's sheet (title, body, optional extra content, optional
 * text input with a dropdown of names under it, an optional note, and a column
 * of buttons). When one popup leads to the next, the overlay stays and the
 * sheets cross: the old one fades away as the new one floats up into place
 * with a faint glow behind it; closing, the sheet fades with the overlay. With
 * Reduce Motion on, sheets simply appear.
 */
import {
  Children,
  ReactElement,
  ReactNode,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from "react";
import { Animated, Modal, Text, View } from "react-native";
import { PromptAction } from "../model/promptActions";
import { useReducedMotion } from "../model/useReducedMotion";
import {
  haloStyle,
  sheetEntranceStyle,
  sheetMotion,
} from "../styles/feedback.styles";
import { styles } from "../styles/promptModal.styles";
import { Button } from "./Button";
import { ChoiceDropdown } from "./ChoiceDropdown";
import { TextField } from "./TextField";

export function PromptHost({
  visible,
  onRequestClose,
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
}) {
  // The sheet on screen is the child marked visible; a sheet that was showing
  // before stays a moment longer to fade away (also while the host closes).
  const current = Children.toArray(children).find(
    (child): child is ReactElement<SheetProps> =>
      isValidElement<SheetProps>(child) && child.props.visible,
  );
  const shown = useRef<ReactElement<SheetProps> | undefined>(current);
  const [leaving, setLeaving] = useState<ReactElement<SheetProps> | null>(null);

  useEffect(() => {
    const before = shown.current;
    shown.current = current;
    if (before && before.key !== current?.key) {
      setLeaving(before);
      const done = setTimeout(
        () => setLeaving(null),
        current ? sheetMotion.leave.duration : sheetMotion.closeHold,
      );
      return () => clearTimeout(done);
    }
  }, [current]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.overlay}>
        <View style={styles.stage}>
          {current ?? (visible ? null : leaving)}
          {current && leaving ? (
            <View style={styles.leaving} pointerEvents="none">
              {cloneElement(leaving, { leaving: true })}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

type SheetProps = { visible: boolean; leaving?: boolean };

export function PromptModal({
  visible,
  title,
  body,
  input,
  note,
  actions,
  leaving = false,
  children,
}: {
  visible: boolean;
  // Set by PromptHost on a sheet that is fading away.
  leaving?: boolean;
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
  children?: ReactNode;
}) {
  return visible ? (
    <Sheet leaving={leaving}>
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
    </Sheet>
  ) : null;
}

// A sheet floats up into place with a glow behind it, or fades away when leaving.
function Sheet({
  leaving,
  children,
}: {
  leaving: boolean;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(leaving ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(leaving ? 0 : 1);
      return;
    }
    Animated.timing(progress, {
      toValue: leaving ? 0 : 1,
      ...(leaving ? sheetMotion.leave : sheetMotion.enter),
    }).start();
  }, [leaving, progress, reduced]);

  return (
    <View>
      {leaving ? null : (
        <Animated.View
          pointerEvents="none"
          style={[styles.halo, haloStyle(progress)]}
        />
      )}
      <Animated.View style={[styles.sheet, sheetEntranceStyle(progress)]}>
        {children}
      </Animated.View>
    </View>
  );
}
