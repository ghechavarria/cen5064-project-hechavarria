/**
 * Presentation: stacked covers for books that share an Open Library series.
 * Must not call fetch or SQL.
 */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Book } from "../domain";
import { Art } from "./Art";
import { glowShadow, theme } from "./theme";

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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onToggle}
      style={styles.wrap}
    >
      <View
        style={[
          styles.fan,
          { width: 72 + 28 * (Math.min(books.length, 5) - 1) },
        ]}
      >
        {books.slice(0, 5).map((book, index) => (
          <View
            key={book.isbn}
            style={[styles.spine, { left: index * 28, zIndex: 10 - index }]}
          >
            {book.coverUrl ? (
              <Art source={{ uri: book.coverUrl }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.fallback]}>
                <Ionicons name="book" size={22} color={theme.glow} />
              </View>
            )}
          </View>
        ))}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{books.length}</Text>
        </View>
      </View>
      <View style={styles.plaque}>
        <Text style={styles.name}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
    alignItems: "center",
    gap: 10,
  },
  fan: {
    height: 118,
    alignSelf: "center",
  },
  spine: {
    position: "absolute",
    top: 8,
    ...glowShadow,
  },
  cover: {
    width: 72,
    height: 108,
    borderRadius: 6,
    backgroundColor: theme.pine,
    borderWidth: 1,
    borderColor: theme.gold,
    overflow: "hidden",
  },
  fallback: { alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 0,
    right: -8,
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.gold,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  badgeText: {
    color: theme.gold,
    fontWeight: "700",
    fontSize: 13,
  },
  plaque: {
    width: "100%",
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.gold,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    ...glowShadow,
  },
  name: {
    fontFamily: theme.serif,
    fontSize: 18,
    fontWeight: "700",
    color: theme.ink,
    textAlign: "center",
  },
});
