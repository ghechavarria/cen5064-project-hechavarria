/**
 * Presentation hook: useKeyboardOpen — true while the phone's keyboard is up,
 * so the screen can make room for the field being typed in (the Scan camera
 * and the menu step aside, and the field stays above the keyboard).
 */
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // iOS announces the keyboard before it moves, Android only once it is up.
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const shown = Keyboard.addListener(show, () => setOpen(true));
    const hidden = Keyboard.addListener(hide, () => setOpen(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return open;
}
