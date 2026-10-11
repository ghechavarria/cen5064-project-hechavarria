/**
 * Component: BookCard — one book row (cover, title, author, meta line; tap to open).
 * A leaf icon marks books already read.
 */
import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Text, View } from "react-native";
import { Book, ReadingStatus } from "../../domain";
import { Labels } from "../model/labels";
import { styles } from "../styles/bookCard.styles";
import { icon, theme } from "../styles/theme";
import { BookCover } from "./BookCover";
import { Tappable } from "./Tappable";

// Memoized: a card re-renders only when its own book, meta or handler changes.
export const BookCard = memo(function BookCard({
  book,
  meta,
  onOpen,
}: {
  book: Book;
  meta?: string;
  onOpen: (book: Book) => void;
}) {
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={Labels.cardAccessibility(book, meta)}
      onPress={() => onOpen(book)}
      style={styles.wrap}
    >
      <BookCover uri={book.coverUrl} style={styles.cover} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {book.author}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta ?? Labels.cardMeta(book)}
        </Text>
      </View>
      <View style={styles.trail} pointerEvents="none">
        {book.readingStatus === ReadingStatus.READ ? (
          <Ionicons name="leaf-outline" size={icon.medium} color={theme.glow} />
        ) : null}
        <Ionicons name="chevron-forward" size={icon.medium} color={theme.muted} />
      </View>
    </Tappable>
  );
});
