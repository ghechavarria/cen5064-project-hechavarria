/**
 * Component: SeriesStack — up to five covers fanned out for one series, with a
 * count badge and the series name, on a halo of the first cover. Tap to expand the series' books.
 */
import { Text, View } from "react-native";
import { Book } from "../../domain";
import { FAN, fanWidth, spineAt, styles } from "../styles/seriesStack.styles";
import { BookCover } from "./BookCover";
import { CoverBackdrop } from "./CoverBackdrop";
import { Tappable } from "./Tappable";

export function SeriesStack({
  title,
  books,
  expanded,
  onToggle,
}: {
  title: string;
  books: Book[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const shown = books.slice(0, FAN.maxCovers);
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onToggle}
      style={styles.wrap}
    >
      <View style={styles.hero}>
        <CoverBackdrop uri={shown[0]?.coverUrl ?? ""} />
        <View style={[styles.fan, fanWidth(shown.length)]}>
          {shown.map((book, index) => (
            <View key={book.isbn} style={[styles.spine, spineAt(index)]}>
              <BookCover uri={book.coverUrl} style={styles.cover} />
            </View>
          ))}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{books.length}</Text>
          </View>
        </View>
      </View>
      <View style={styles.plaque}>
        <Text style={styles.name}>{title}</Text>
      </View>
    </Tappable>
  );
}
