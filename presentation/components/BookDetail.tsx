/**
 * Component: BookDetail — one book's detail screen: the cover on its halo, the
 * author and status tags, the edition's facts, what it's about, and the actions.
 */
import { Text, View } from "react-native";
import { Book, ReadingStatus, Shelf } from "../../domain";
import { Labels } from "../model/labels";
import { styles } from "../styles/bookDetail.styles";
import { icon } from "../styles/theme";
import { BookCover } from "./BookCover";
import { Button } from "./Button";
import { CoverBackdrop } from "./CoverBackdrop";

export function BookDetail({
  book,
  onToggleReading,
  onChangeCover,
  onMoveToOwned,
  onMoveToWanted,
  onDelete,
}: {
  book: Book;
  onToggleReading: () => void;
  onChangeCover: () => void;
  onMoveToOwned: () => void;
  onMoveToWanted: () => void;
  onDelete: () => void;
}) {
  const tags = [Labels.shelf(book.shelf), Labels.readingTitle(book.readingStatus), Labels.format(book.format)];
  return (
    <View>
      <View style={styles.hero}>
        <CoverBackdrop uri={book.coverUrl} />
        <BookCover uri={book.coverUrl} style={styles.cover} iconSize={icon.hero} />
      </View>
      <View style={styles.card}>
        <View>
          <Text style={styles.author}>{book.author}</Text>
          <View style={styles.tags}>
            {tags.filter(Boolean).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Details</Text>
          {Labels.facts(book).map((fact) => (
            <View key={fact.label} style={styles.fact}>
              <Text style={styles.factLabel}>{fact.label}</Text>
              <Text style={styles.factValue}>{fact.value}</Text>
            </View>
          ))}
        </View>

        <View>
          <Text style={styles.label}>About</Text>
          <Text style={styles.body}>{Labels.about(book)}</Text>
          {book.subjects ? <Text style={styles.subjects}>{book.subjects}</Text> : null}
        </View>

        <View>
          <Button
            label={book.readingStatus === ReadingStatus.READ ? "Mark unread" : "Mark read"}
            onPress={onToggleReading}
          />
          <View style={styles.actionRow}>
            {book.shelf === Shelf.WANTED ? (
              <Button label="To Owned" tone="secondary" fill onPress={onMoveToOwned} />
            ) : (
              <Button label="To Wanted" tone="secondary" fill onPress={onMoveToWanted} />
            )}
            <Button label="Cover photo" tone="secondary" fill onPress={onChangeCover} />
          </View>
          <Button label="Delete from library" tone="dangerOutline" onPress={onDelete} />
        </View>
      </View>
    </View>
  );
}
