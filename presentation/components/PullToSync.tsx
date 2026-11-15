/**
 * Component: PullToSync — the spinner a book list shows while it is pulled down
 * to sync (ADR-013), in the app's glow color. Passed to a ScrollView as its
 * refreshControl; the ScrollView adds its own props, which are passed through.
 */
import { RefreshControl, RefreshControlProps } from "react-native";
import { theme } from "../styles/theme";

export function PullToSync(props: RefreshControlProps) {
  return (
    <RefreshControl
      tintColor={theme.glow}
      colors={[theme.glow]}
      progressBackgroundColor={theme.card}
      accessibilityLabel="Pull down to sync your library"
      {...props}
    />
  );
}
