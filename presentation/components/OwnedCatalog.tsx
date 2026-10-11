/**
 * Component: OwnedCatalog — the Owned tab. A segmented switch picks the
 * grouping strategy (A–Z / Author / Series); every mode shows its sections in
 * one scrolling list with the LetterRail beside it:
 *   - A–Z and Author: an index heading per section, then its books
 *   - Series: a fanned SeriesStack per series (tap to expand); standalone books listed plainly
 * Grouping rules live in CatalogGrouping; rail math lives in AlphabetRail.
 */
import { useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Book } from "../../domain";
import { Catalog, CatalogMode, CatalogSection } from "../model/catalog";
import { styles } from "../styles/ownedCatalog.styles";
import { BookCard } from "./BookCard";
import { Reveal } from "./Reveal";
import { EmptyShelf } from "./EmptyShelf";
import { LetterRail } from "./LetterRail";
import { SegmentedControl } from "./SegmentedControl";
import { SeriesStack } from "./SeriesStack";

const MODE_SEGMENTS = Catalog.groupings.map((grouping) => ({
  key: grouping.mode,
  label: grouping.label,
}));

export function OwnedCatalog({
  books,
  mode,
  onMode,
  onOpen,
}: {
  books: Book[];
  mode: CatalogMode;
  onMode: (mode: CatalogMode) => void;
  onOpen: (book: Book) => void;
}) {
  const scroll = useRef<ScrollView>(null);
  // Each section's measured top inside the list, so the rail can jump to it exactly.
  const sectionTops = useRef<number[]>([]);
  const [openSeries, setOpenSeries] = useState<string | null>(null);
  const sections = Catalog.sections(books, mode);

  // A new grouping starts at the top of the list.
  function switchMode(next: CatalogMode) {
    scroll.current?.scrollTo({ y: 0, animated: false });
    onMode(next);
  }

  if (books.length === 0) {
    return (
      <View style={styles.wrap}>
        <SegmentedControl segments={MODE_SEGMENTS} selected={mode} onSelect={onMode} />
        <EmptyShelf
          iconName="library-outline"
          title="No owned books yet"
          message="Scan an ISBN onto Owned to fill this catalog."
          style={styles.empty}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <SegmentedControl segments={MODE_SEGMENTS} selected={mode} onSelect={switchMode} />
      <View style={styles.listWrap}>
        <ScrollView
          ref={scroll}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((section, index) => (
            <View
              key={`${mode}:${section.title}`}
              onLayout={(event) => {
                sectionTops.current[index] = event.nativeEvent.layout.y;
              }}
            >
              {mode === "series" ? (
                <SeriesSection
                  section={section}
                  expanded={openSeries === section.title}
                  onToggle={() =>
                    setOpenSeries(openSeries === section.title ? null : section.title)
                  }
                  onOpen={onOpen}
                />
              ) : (
                <LetterSection section={section} onOpen={onOpen} />
              )}
            </View>
          ))}
        </ScrollView>
        <LetterRail
          sections={sections}
          onJump={(index) =>
            scroll.current?.scrollTo({ y: sectionTops.current[index] ?? 0, animated: false })
          }
        />
      </View>
    </View>
  );
}

/** A–Z / Author: the section's index heading, then its books. */
function LetterSection({
  section,
  onOpen,
}: {
  section: CatalogSection;
  onOpen: (book: Book) => void;
}) {
  return (
    <>
      <SectionHeading title={section.title} />
      {section.data.map((book, index) => (
        <Reveal key={book.isbn} index={index}>
          <BookCard book={book} meta={book.series.trim() || "Standalone"} onOpen={onOpen} />
        </Reveal>
      ))}
    </>
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
        <SeriesStack
          title={section.title}
          books={section.data}
          expanded={expanded}
          onToggle={onToggle}
        />
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

function SectionHeading({ title }: { title: string }) {
  return (
    <View style={styles.sectionHead} accessibilityRole="header">
      <Text style={styles.section}>{title}</Text>
      <View style={styles.rule} />
    </View>
  );
}
