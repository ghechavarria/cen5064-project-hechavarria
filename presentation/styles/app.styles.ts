/** Styles for the App shell (frame, loading screen, scrolling stage). */
import { StyleSheet } from "react-native";
import { space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: theme.bg },
  frame: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center", minHeight: 0 },
  stage: { flex: 1, minHeight: 0 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md },
  muted: text.muted,
  scroll: { flex: 1, minHeight: 0, backgroundColor: "transparent" },
  main: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.md },
});

// Keep content below the phone's status bar / notch.
export function belowStatusBar(topInset: number) {
  return { paddingTop: topInset };
}
