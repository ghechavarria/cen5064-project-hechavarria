/**
 * Component: OwnedCatalog — the Owned tab. A segmented switch picks the
 * grouping strategy (A–Z / Author / Series); every mode shows its sections in
 * one scrolling list with the LetterRail beside it:
 *   - A–Z and Author: an index heading per section, then its books
 *   - Series: a fanned SeriesStack per series (tap to expand); standalone books listed plainly
 * Pulling the list down (or the empty catalog) runs `refreshControl`, when given.
 * Grouping rules live in CatalogGrouping; rail math lives in AlphabetRail.
 */
import { Ionicons } from "@expo/vector-icons";
import { ComponentRef, ReactElement, useRef, useState } from "react";
import { RefreshControlProps, ScrollView, Text, View } from "react-native";
import { Book } from "../../domain";
import { Catalog, CatalogMode, CatalogSection } from "../model/catalog";
import { styles } from "../styles/ownedCatalog.styles";
import { icon, theme } from "../styles/theme";
import { BookCard } from "./BookCard";
import { Reveal } from "./Reveal";
import { EmptyShelf } from "./EmptyShelf";
import { LetterRail } from "./LetterRail";
import { SegmentedControl } from "./SegmentedControl";
import { SeriesStack } from "./SeriesStack";
import { Tappable } from "./Tappable";

const MODE_SEGMENTS = Catalog.groupings.map((grouping) => ({
  key: grouping.mode,
  label: grouping.label,
}));

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
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // Each section's measured top inside the list, so the rail can jump to it exactly.
  const sectionTops = useRef<number[]>([]);
  const [openSeries, setOpenSeries] = useState<string | null>(null);
  const sections = Catalog.sections(books, mode);

  // A new grouping starts at the top of the list.
  function switchMode(next: CatalogMode) {
    scroll.current?.scrollTo({ y: 0, animated: false });
    onMode(next);
  }

  // Nothing to list: no owned books at all, or none in this grouping (no gifts yet).
  if (sections.length === 0) {
    const { empty } = Catalog.grouping(mode);
    return (
      <View style={styles.wrap}>
        <SegmentedControl segments={MODE_SEGMENTS} selected={mode} onSelect={switchMode} />
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
      <SegmentedControl segments={MODE_SEGMENTS} selected={mode} onSelect={switchMode} />
      <View style={styles.listWrap}>
        <ScrollView
          ref={scroll}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
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
                <LetterSection
                  section={section}
                  onOpen={onOpen}
                  // In Gifted, each section is one giver: the pen renames them on all their books.
                  onEdit={mode === "gifts" ? () => onRenameGiver(section.data[0]?.giftedBy ?? "") : undefined}
                />
              )}
            </View>
          ))}
        </ScrollView>
        {Catalog.grouping(mode).hasRail ? (
          <LetterRail
            sections={sections}
            onJump={(index) =>
              scroll.current?.scrollTo({ y: sectionTops.current[index] ?? 0, animated: false })
            }
          />
        ) : null}
      </View>
    </View>
  );
}

/** A–Z / Author / Gifted: the section's index heading, then its books. */
function LetterSection({
  section,
  onOpen,
  onEdit,
}: {
  section: CatalogSection;
  onOpen: (book: Book) => void;
  onEdit?: () => void;
}) {
  return (
    <>
      <SectionHeading title={section.title} onEdit={onEdit} />
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

function SectionHeading({ title, onEdit }: { title: string; onEdit?: () => void }) {
  return (
    <View style={styles.sectionHead} accessibilityRole="header">
      <Text style={styles.section}>{title}</Text>
      {onEdit ? (
        <Tappable accessibilityRole="button" accessibilityLabel={`Rename: ${title}`} onPress={onEdit} hitSlop={12} style={styles.edit}>
          <Ionicons name="pencil" size={icon.medium} color={theme.glow} />
        </Tappable>
      ) : null}
      <View style={styles.rule} />
    </View>
  );
}
