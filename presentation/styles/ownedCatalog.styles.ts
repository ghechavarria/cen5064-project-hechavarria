/** Styles for OwnedCatalog (the list beside the letter rail, and its index headings). */
import { StyleSheet } from "react-native";
import { font, space, text, theme } from "./theme";

export const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  listWrap: { flex: 1, minHeight: 0, flexDirection: "row", paddingRight: space.xs },
  list: { flex: 1, backgroundColor: "transparent" },
  listContent: { paddingLeft: space.lg, paddingRight: space.xs, paddingBottom: space.xl },
  // An editorial index heading: the letter (or name) in bold mint, then a hairline to the edge.
  sectionHead: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.sm, marginBottom: space.md },
  section: { ...text.display, color: theme.glow, fontSize: font.heading },
  rule: { flex: 1, height: 1, backgroundColor: theme.border },
  empty: { marginHorizontal: space.lg },
});
