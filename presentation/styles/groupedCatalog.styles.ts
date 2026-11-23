/** Styles for GroupedCatalog (its frame and empty card; the list itself is CatalogList's). */
import { StyleSheet } from "react-native";
import { space } from "./theme";

export const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  empty: { marginHorizontal: space.lg },
});
