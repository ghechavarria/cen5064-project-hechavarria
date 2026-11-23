/**
 * Component: CatalogList — a scrolling list of book sections with the A–Z
 * LetterRail down its right edge, used by every book list (To be read, Owned in
 * each grouping, Wanted). The caller draws each section; CatalogList measures
 * where each one starts so the rail can jump to it, and returns to the top
 * whenever `resetKey` changes (a new grouping or reading switch).
 * Also here: LetterSection and SectionHeading, the plain section look.
 */
import { Ionicons } from "@expo/vector-icons";
import { ComponentRef, ReactElement, ReactNode, useEffect, useRef } from "react";
import { RefreshControlProps, ScrollView, Text, View } from "react-native";
import { Book } from "../../domain";
import { CatalogSection } from "../model/catalog";
import { styles } from "../styles/catalogList.styles";
import { icon, theme } from "../styles/theme";
import { BookCard } from "./BookCard";
import { LetterRail } from "./LetterRail";
import { Reveal } from "./Reveal";
import { Tappable } from "./Tappable";

export function CatalogList({
  sections,
  resetKey,
  renderSection,
  refreshControl,
}: {
  sections: CatalogSection[];
  resetKey: string;
  renderSection: (section: CatalogSection) => ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // Each section's measured top inside the list, so the rail can jump to it exactly.
  const sectionTops = useRef<number[]>([]);

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [resetKey]);

  return (
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
            key={`${resetKey}:${section.title}`}
            onLayout={(event) => {
              sectionTops.current[index] = event.nativeEvent.layout.y;
            }}
          >
            {renderSection(section)}
          </View>
        ))}
      </ScrollView>
      <LetterRail
        sections={sections}
        onJump={(index) => scroll.current?.scrollTo({ y: sectionTops.current[index] ?? 0, animated: false })}
      />
    </View>
  );
}

/** A section's index heading, then its books (with `meta` under each title, when given). */
export function LetterSection({
  section,
  onOpen,
  meta,
  onEdit,
}: {
  section: CatalogSection;
  onOpen: (book: Book) => void;
  meta?: (book: Book) => string;
  onEdit?: () => void;
}) {
  return (
    <>
      <SectionHeading title={section.title} onEdit={onEdit} />
      {section.data.map((book, index) => (
        <Reveal key={book.isbn} index={index}>
          <BookCard book={book} meta={meta?.(book)} onOpen={onOpen} />
        </Reveal>
      ))}
    </>
  );
}

export function SectionHeading({ title, onEdit }: { title: string; onEdit?: () => void }) {
  return (
    <View style={styles.sectionHead} accessibilityRole="header">
      {/* The pen sits right after the name it renames, then the rule runs on. */}
      <View style={styles.titleGroup}>
        <Text style={styles.section}>{title}</Text>
        {onEdit ? (
          <Tappable accessibilityRole="button" accessibilityLabel={`Rename: ${title}`} onPress={onEdit} hitSlop={14}>
            <Ionicons name="pencil" size={icon.small} color={theme.glow} />
          </Tappable>
        ) : null}
      </View>
      <View style={styles.rule} />
    </View>
  );
}
