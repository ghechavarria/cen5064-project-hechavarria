/**
 * Component: LibraryHighlights — four lines under the stat tiles on the Account
 * tab: pages read (with a thin bar), the top genres as chips, gifts and who gave
 * the most, and the latest addition (its cover; tap to open the book).
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ComponentProps, ReactNode } from "react";
import { Text, View } from "react-native";
import { Book } from "../../domain";
import { LibraryHighlights as Highlights } from "../model/libraryAppModel";
import { readFade, styles } from "../styles/libraryHighlights.styles";
import { icon, theme } from "../styles/theme";
import { BookCover } from "./BookCover";
import { Tappable } from "./Tappable";

export function LibraryHighlights({
  highlights,
  onOpenBook,
  onShowGifts,
}: {
  highlights: Highlights;
  onOpenBook: (book: Book) => void;
  onShowGifts: () => void;
}) {
  const { pages, genres, gifts, latest } = highlights;
  return (
    <View style={styles.list}>
      <Row iconName="document-text-outline" title="Pages read" value={pages?.text ?? "No page counts yet"}>
        {pages ? (
          <View style={styles.track}>
            <LinearGradient
              colors={readFade}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${Math.round(pages.share * 100)}%` }]}
            />
          </View>
        ) : null}
      </Row>
      <Row iconName="pricetags-outline" title="Top genres" value={genres.length === 0 ? "Not known yet" : ""}>
        {genres.length > 0 ? (
          <View style={styles.chips}>
            {genres.map((genre) => (
              <Text key={genre} style={styles.chip}>
                {genre}
              </Text>
            ))}
          </View>
        ) : null}
      </Row>
      <Row iconName="gift-outline" title="Gifts" value={gifts.text} onPress={gifts.count > 0 ? onShowGifts : undefined} />
      {latest ? (
        <Tappable
          accessibilityRole="button"
          accessibilityLabel={`Latest addition: ${latest.book.title}. ${latest.added}`}
          onPress={() => onOpenBook(latest.book)}
          style={styles.latest}
        >
          <BookCover uri={latest.book.coverUrl} style={styles.cover} iconSize={icon.small} />
          <View style={styles.latestText}>
            <Text style={styles.title}>Latest addition</Text>
            <Text style={styles.bookTitle} numberOfLines={1}>
              {latest.book.title}
            </Text>
            <Text style={styles.added}>{latest.added}</Text>
          </View>
          <Ionicons name="chevron-forward" size={icon.medium} color={theme.muted} />
        </Tappable>
      ) : null}
    </View>
  );
}

// One highlight; with onPress it opens a list (a chevron says so).
function Row({
  iconName,
  title,
  value,
  onPress,
  children,
}: {
  iconName: ComponentProps<typeof Ionicons>["name"];
  title: string;
  value: string;
  onPress?: () => void;
  children?: ReactNode;
}) {
  const head = (
    <View style={styles.head}>
      <Ionicons name={iconName} size={icon.small} color={theme.bloom} />
      <Text style={styles.title}>{title}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={icon.small} color={theme.muted} /> : null}
    </View>
  );
  return onPress ? (
    <Tappable accessibilityRole="button" accessibilityLabel={`${title}: ${value}. Show them`} onPress={onPress} style={styles.row}>
      {head}
      {children}
    </Tappable>
  ) : (
    <View style={styles.row} accessible accessibilityLabel={`${title}: ${value}`}>
      {head}
      {children}
    </View>
  );
}
