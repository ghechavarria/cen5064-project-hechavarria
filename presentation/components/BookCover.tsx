/**
 * Component: BookCover — a book cover that reads as a physical book: the art
 * (or a book icon when there is none) clipped inside the frame, a lit spine
 * edge on the left, and the frame's own shadow beneath.
 * Used by BookCard, BookDetail, SeriesStack, CoverPicker and the scan popup.
 */
import { Ionicons } from "@expo/vector-icons";
import { StyleProp, View, ViewStyle } from "react-native";
import { styles } from "../styles/bookCover.styles";
import { icon, theme } from "../styles/theme";
import { Art } from "./Art";

export function BookCover({
  uri,
  style,
  iconSize = icon.large,
  iconColor = theme.glow,
}: {
  uri: string;
  style: StyleProp<ViewStyle>;
  iconSize?: number;
  iconColor?: string;
}) {
  return (
    <View style={style}>
      <View style={styles.inner}>
        {uri ? (
          <Art source={{ uri }} style={styles.art} />
        ) : (
          <Ionicons name="book" size={iconSize} color={iconColor} />
        )}
        <View style={styles.spine} />
        <View style={styles.spineShade} />
      </View>
    </View>
  );
}
