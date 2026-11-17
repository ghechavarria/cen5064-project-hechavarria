/** Styles for BookList (To be read and Wanted: the list's frame, and its empty card). */
import { StyleSheet } from "react-native";
import { space } from "./theme";

export const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  empty: { paddingHorizontal: space.lg, paddingBottom: space.xl },
});
