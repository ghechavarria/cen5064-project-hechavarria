/**
 * Component: BookList — To be read or Wanted: the books under A–Z index
 * headings in a CatalogList, with the A–Z rail on the right like every list.
 * Empty, an EmptyShelf card that offers to scan (still pullable, to sync).
 */
import { ReactElement } from "react";
import { RefreshControlProps, ScrollView, View } from "react-native";
import { Book } from "../../domain";
import { Catalog } from "../model/catalog";
import { styles } from "../styles/bookList.styles";
import { CatalogList, LetterSection } from "./CatalogList";
import { EmptyShelf } from "./EmptyShelf";

export function BookList({
  books,
  empty,
  resetKey,
  onOpen,
  onScan,
  refreshControl,
}: {
  books: Book[];
  empty: string;
  resetKey: string;
  onOpen: (book: Book) => void;
  onScan: () => void;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  if (books.length === 0) {
    return (
      <ScrollView refreshControl={refreshControl} showsVerticalScrollIndicator={false} contentContainerStyle={styles.empty}>
        <EmptyShelf
          iconName="leaf-outline"
          title="The shelf is quiet"
          message={empty}
          action={{ label: "Scan a book", onPress: onScan }}
        />
      </ScrollView>
    );
  }
  return (
    <View style={styles.wrap}>
      <CatalogList
        sections={Catalog.sections(books, "az")}
        resetKey={resetKey}
        refreshControl={refreshControl}
        renderSection={(section) => <LetterSection section={section} onOpen={onOpen} />}
      />
    </View>
  );
}
