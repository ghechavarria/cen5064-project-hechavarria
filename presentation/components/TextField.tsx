/**
 * Component: TextField — the app's one text input (the ISBN field and the
 * gift-name field). Its edge lights up mint while it has focus.
 */
import { useState } from "react";
import { StyleProp, TextInput, TextInputProps, ViewStyle } from "react-native";
import { styles } from "../styles/textField.styles";
import { theme } from "../styles/theme";

export function TextField({ style, onFocus, onBlur, ...props }: TextInputProps & { style?: StyleProp<ViewStyle> }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={theme.muted}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[styles.input, focused && styles.focused, style]}
      {...props}
    />
  );
}
