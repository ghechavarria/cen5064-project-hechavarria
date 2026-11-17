/**
 * Component: OwnedCatalog — the Owned tab. A segmented switch picks the
 * grouping strategy (A–Z / Author / Series / Gifted); every mode shows its
 * sections in one CatalogList with the A–Z rail beside it:
 *   - A–Z and Author: an index heading per section, then its books
 *   - Series: a fanned SeriesStack per series (tap to expand); standalone books listed plainly
 *   - Gifted: a heading per giver, with a pen to rename them on all their books
 * Pulling the list down (or the empty catalog) runs `refreshControl`, when given.
 * Grouping rules live in CatalogGrouping; rail math lives in AlphabetRail.
 */
import { ReactElement, useState } from "react";
import { RefreshControlProps, ScrollView, View } from "react-native";
import { Book } from "../../domain";
import { Catalog, CatalogMode, CatalogSection } from "../model/catalog";
import { styles } from "../styles/ownedCatalog.styles";
import { BookCard } from "./BookCard";
import { CatalogList, LetterSection, SectionHeading } from "./CatalogList";
import { EmptyShelf } from "./EmptyShelf";
import { Reveal } from "./Reveal";
import { SegmentedControl } from "./SegmentedControl";
import { SeriesStack } from "./SeriesStack";

const MODE_SEGMENTS = Catalog.groupings.map((grouping) => ({
  key: grouping.mode,
  label: grouping.label,
}));

// The line under a book's title in the catalog: its series.
const seriesOf = (book: Book) => book.series.trim() || "Standalone";

export function OwnedCatalog({
  books,
  mode,
  onMode,
  onOpen,
  onRenameGiver,
  refreshControl,
}: {
  books: Book[];
  mode: CatalogMode;
  onMode: (mode: CatalogMode) => void;
  onOpen: (book: Book) => void;
  onRenameGiver: (name: string) => void;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const [openSeries, setOpenSeries] = useState<string | null>(null);
  const sections = Catalog.sections(books, mode);

  // Nothing to list: no owned books at all, or none in this grouping (no gifts yet).
  if (sections.length === 0) {
    const { empty } = Catalog.grouping(mode);
    return (
      <View style={styles.wrap}>
        <SegmentedControl segments={MODE_SEGMENTS} selected={mode} onSelect={onMode} />
        {/* Scrollable even when empty, so it can be pulled down to sync. */}
        <ScrollView refreshControl={refreshControl} showsVerticalScrollIndicator={false}>
          <EmptyShelf
            iconName={mode === "gifts" ? "gift-outline" : "library-outline"}
            title={books.length === 0 ? Catalog.groupings[0].empty.title : empty.title}
            message={books.length === 0 ? Catalog.groupings[0].empty.message : empty.message}
            style={styles.empty}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <SegmentedControl segments={MODE_SEGMENTS} selected={mode} onSelect={onMode} />
      <CatalogList
        sections={sections}
        resetKey={mode}
        refreshControl={refreshControl}
        renderSection={(section) =>
          mode === "series" ? (
            <SeriesSection
              section={section}
              expanded={openSeries === section.title}
              onToggle={() => setOpenSeries(openSeries === section.title ? null : section.title)}
              onOpen={onOpen}
            />
          ) : (
            <LetterSection
              section={section}
              onOpen={onOpen}
              meta={seriesOf}
              // In Gifted, each section is one giver: the pen renames them on all their books.
              onEdit={mode === "gifts" ? () => onRenameGiver(section.data[0]?.giftedBy ?? "") : undefined}
            />
          )
        }
      />
    </View>
  );
}

/** Series: standalone books listed plainly; a real series as a stack that expands. */
function SeriesSection({
  section,
  expanded,
  onToggle,
  onOpen,
}: {
  section: CatalogSection;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (book: Book) => void;
}) {
  const standalone = section.title === "Standalone";
  return (
    <>
      {standalone ? (
        <SectionHeading title={section.title} />
      ) : (
        <SeriesStack title={section.title} books={section.data} expanded={expanded} onToggle={onToggle} />
      )}
      {standalone || expanded
        ? section.data.map((book, index) => (
            <Reveal key={book.isbn} index={index}>
              <BookCard book={book} meta={section.title} onOpen={onOpen} />
            </Reveal>
          ))
        : null}
    </>
  );
}
