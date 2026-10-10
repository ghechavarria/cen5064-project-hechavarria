/** Styles for CoverPicker (row of cover thumbnails plus the photo tile, on a halo). */
import { StyleSheet } from "react-native";
import { sheetPadding } from "./promptModal.styles";
import { coverSurface, font, radius, space, text, theme } from "./theme";

const TILE_WIDTH = 80;
const TILE_HEIGHT = 120;

export const styles = StyleSheet.create({
  // Bleeds edge to edge across the popup sheet, behind the cover row.
  band: { marginHorizontal: -sheetPadding, paddingVertical: space.lg, overflow: "hidden" },
  row: { gap: space.sm, paddingVertical: space.xs, paddingHorizontal: sheetPadding },
  // The selected cover gets the glowing border.
  tile: {
    width: TILE_WIDTH + 6,
    height: TILE_HEIGHT + 6,
    borderRadius: radius.sm + 2,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  tileOn: { borderColor: theme.glow, backgroundColor: theme.selected },
  cover: { ...coverSurface, width: TILE_WIDTH, height: TILE_HEIGHT },
  // Chosen cover: a mint check in the corner, so the pick isn't shown by color alone.
  check: {
    position: "absolute",
    top: -space.xs,
    right: -space.xs,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: theme.glow,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: { borderColor: theme.border, borderStyle: "dashed", gap: space.xs },
  photoText: { ...text.ui, color: theme.muted, fontSize: font.tiny, textAlign: "center" },
});
