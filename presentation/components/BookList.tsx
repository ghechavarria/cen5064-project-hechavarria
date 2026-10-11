/**
 * Component: BookList — BookCards for TBR or Wanted, or an EmptyShelf card when there are none.
 */
import { View } from "react-native";
import { Book } from "../../domain";
import { BookCard } from "./BookCard";
import { EmptyShelf } from "./EmptyShelf";
import { Reveal } from "./Reveal";

export function BookList({
  books,
  empty,
  onOpen,
  onScan,
}: {
  books: Book[];
  empty: string;
  onOpen: (book: Book) => void;
  onScan: () => void;
}) {
  if (books.length === 0) {
    return (
      <EmptyShelf
        iconName="leaf-outline"
        title="The shelf is quiet"
        message={empty}
        action={{ label: "Scan a book", onPress: onScan }}
      />
    );
  }
  return (
    <View>
      {books.map((book, index) => (
        <Reveal key={book.isbn} index={index}>
          <BookCard book={book} onOpen={onOpen} />
        </Reveal>
      ))}
    </View>
  );
}
