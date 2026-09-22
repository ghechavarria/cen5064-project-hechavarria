/**
 * Presentation: Owned catalog (A–Z / author / series). View only.
 * Must not call fetch or SQL.
 */
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Book } from "../domain";
import { CatalogMode, CatalogSection, LETTERS, catalogSections } from "./catalog";
import { BookCard } from "./BookCard";
import { SeriesStack } from "./SeriesStack";
import { glowShadow, theme } from "./theme";

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
  const list = useRef<SectionList<Book, CatalogSection>>(null);
  const rail = useRef<View>(null);
  const railBox = useRef({ y: 0, height: 1 });
  const sectionY = useRef<number[]>([]);
  const sections = catalogSections(books, mode);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const [scrub, setScrub] = useState<string | null>(null);
  const [openSeries, setOpenSeries] = useState<string | null>(null);

  function jumpFromPageY(pageY: number) {
    const letter =
      LETTERS[
        Math.min(
          LETTERS.length - 1,
          Math.max(
            0,
            Math.floor(((pageY - railBox.current.y) / railBox.current.height) * LETTERS.length),
          ),
        )
      ];
    setScrub(letter);
    if (sectionsRef.current.length === 0) {
      return;
    }
    const index = sectionsRef.current.reduce(
      (best, section, i) => (LETTERS.indexOf(section.title) <= LETTERS.indexOf(letter) ? i : best),
      0,
    );
    list.current?.getScrollResponder()?.scrollTo({
      y: sectionsRef.current
        .slice(0, index)
        .reduce((sum, section) => sum + 28 + 108 * section.data.length, 0),
      animated: false,
    });
    list.current?.scrollToLocation({
      sectionIndex: index,
      itemIndex: 0,
      animated: false,
    });
    const node = (list.current as unknown as { getScrollableNode?: () => unknown }).getScrollableNode?.();
    if (node && typeof node === "object" && "scrollTop" in node) {
      (node as { scrollTop: number }).scrollTop = sectionsRef.current
        .slice(0, index)
        .reduce((sum, section) => sum + 28 + 108 * section.data.length, 0);
    }
  }

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (event) => {
          rail.current?.measureInWindow((_x, y, _w, height) => {
            railBox.current = { y, height: Math.max(height, 1) };
            jumpFromPageY(event.nativeEvent.pageY);
          });
        },
        onPanResponderMove: (event) => jumpFromPageY(event.nativeEvent.pageY),
        onPanResponderRelease: () => setScrub(null),
        onPanResponderTerminate: () => setScrub(null),
      }),
    [],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.segment}>
        {(
          [
            ["az", "A–Z"],
            ["author", "Author"],
            ["series", "Series"],
          ] as [CatalogMode, string][]
        ).map(([id, label]) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            style={styles.segmentTab}
            onPress={() => onMode(id)}
          >
            <Text style={[styles.segmentText, mode === id && styles.segmentTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {books.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="library-outline" size={36} color={theme.glow} />
          <Text style={styles.emptyTitle}>No owned books yet</Text>
          <Text style={styles.muted}>Scan an ISBN onto Owned to fill this catalog.</Text>
        </View>
      ) : (
        <View style={styles.listWrap}>
          {mode === "series" ? (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {sections.map((section) =>
                section.title === "Standalone" ? (
                  <View key="Standalone">
                    <View style={styles.sectionChip}>
                      <Text style={styles.section}>Standalone</Text>
                    </View>
                    {section.data.map((item) => (
                      <BookCard
                        key={item.isbn}
                        book={item}
                        meta="Standalone"
                        onOpen={onOpen}
                      />
                    ))}
                  </View>
                ) : (
                  <View key={section.title}>
                    <SeriesStack
                      title={section.title}
                      books={section.data}
                      expanded={openSeries === section.title}
                      onToggle={() =>
                        setOpenSeries(openSeries === section.title ? null : section.title)
                      }
                    />
                    {openSeries === section.title
                      ? section.data.map((item) => (
                          <BookCard
                            key={item.isbn}
                            book={item}
                            meta={section.title}
                            onOpen={onOpen}
                          />
                        ))
                      : null}
                  </View>
                ),
              )}
            </ScrollView>
          ) : (
            <SectionList
              ref={list}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              sections={sections}
              keyExtractor={(book) => book.isbn}
              stickySectionHeadersEnabled
              onScrollToIndexFailed={(info) =>
                list.current?.getScrollResponder()?.scrollTo({
                  y: sectionY.current[info.index] ?? Math.max(info.averageItemLength, 1) * info.index,
                  animated: false,
                })
              }
              renderSectionHeader={({ section }) => (
                <View
                  onLayout={(event) => {
                    sectionY.current[
                      sectionsRef.current.findIndex((entry) => entry.title === section.title)
                    ] = event.nativeEvent.layout.y;
                  }}
                >
                  <View style={styles.sectionChip}>
                    <Text style={styles.section}>{section.title}</Text>
                  </View>
                </View>
              )}
              renderItem={({ item }) => (
                <BookCard
                  book={item}
                  meta={item.series.trim() || "Standalone"}
                  onOpen={onOpen}
                />
              )}
            />
          )}
          {mode === "az" ? (
            <Pressable
              ref={rail}
              accessibilityRole="adjustable"
              accessibilityLabel="A to Z index"
              style={styles.rail}
              onPress={(event) => jumpFromPageY(event.nativeEvent.pageY)}
              onPressIn={(event) => {
                rail.current?.measureInWindow((_x, y, _w, height) => {
                  railBox.current = { y, height: Math.max(height, 1) };
                  jumpFromPageY(event.nativeEvent.pageY);
                });
              }}
              onLayout={() =>
                rail.current?.measureInWindow((_x, y, _w, height) => {
                  railBox.current = { y, height: Math.max(height, 1) };
                })
              }
              {...pan.panHandlers}
            >
              {LETTERS.map((letter) => (
                <Text
                  key={letter}
                  style={[styles.railLetter, scrub === letter && styles.railLetterOn]}
                >
                  {letter}
                </Text>
              ))}
              {scrub ? (
                <View style={styles.bubble} pointerEvents="none">
                  <Text style={styles.bubbleText}>{scrub}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  segment: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 8,
    minHeight: 52,
    paddingHorizontal: 8,
    borderRadius: 22,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    ...glowShadow,
  },
  segmentTab: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: { fontWeight: "600", color: theme.muted, fontSize: 13 },
  segmentTextOn: { color: theme.ink, fontFamily: theme.serif, fontSize: 14 },
  listWrap: { flex: 1, flexDirection: "row" },
  list: { flex: 1, backgroundColor: "transparent" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionChip: {
    alignSelf: "flex-start",
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
    ...glowShadow,
  },
  section: {
    fontFamily: theme.serif,
    fontWeight: "700",
    color: theme.ink,
    fontSize: 15,
  },
  rail: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  railLetter: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.muted,
    lineHeight: 14,
    pointerEvents: "none",
  },
  railLetterOn: { color: theme.glow, fontSize: 12 },
  bubble: {
    position: "absolute",
    right: 36,
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    ...glowShadow,
  },
  bubbleText: {
    fontFamily: theme.serif,
    fontSize: 22,
    fontWeight: "700",
    color: theme.ink,
  },
  muted: { color: theme.muted, fontSize: 15, lineHeight: 22, textAlign: "center" },
  empty: {
    marginHorizontal: 16,
    backgroundColor: "rgba(21,32,51,0.55)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyTitle: { fontFamily: theme.serif, fontSize: 20, fontWeight: "700", color: theme.ink },
});
