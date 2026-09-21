/**
 * Presentation: one Book row (cover, title, tap to detail).
 * Must not call fetch or SQL.
 */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Book, ReadingStatus } from "../domain";
import { Art } from "./Art";
import { glowShadow, theme } from "./theme";

export function BookCard({
  book,
  meta,
  onOpen,
}: {
  book: Book;
  meta?: string;
  onOpen: (book: Book) => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={() => onOpen(book)} style={styles.wrap}>
      {book.coverUrl ? (
        <Art source={{ uri: book.coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverFallback]}>
          <Ionicons name="book" size={22} color={theme.glow} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {book.author}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta ?? `${book.isbn} · ${book.copyCount} ${book.copyCount === 1 ? "copy" : "copies"}`}
        </Text>
      </View>
      {book.readingStatus === ReadingStatus.READ ? (
        <View style={styles.leaf} pointerEvents="none">
          <Ionicons name="leaf-outline" size={18} color={theme.glow} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    ...glowShadow,
  },
  cover: {
    width: 52,
    height: 76,
    borderRadius: 6,
    backgroundColor: theme.pine,
    borderWidth: 1,
    borderColor: theme.glow,
    overflow: "hidden",
  },
  coverFallback: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
  title: {
    fontFamily: theme.serif,
    fontWeight: "700",
    fontSize: 18,
    color: theme.ink,
  },
  author: { color: theme.muted, fontSize: 14 },
  meta: { color: theme.gold, fontSize: 12, marginTop: 2, opacity: 0.9 },
  leaf: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
