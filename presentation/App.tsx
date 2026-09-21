/**
 * Presentation: TBR / Owned / Wanted / Scan screens.
 * Must not call fetch or SQL; Scan is lookup → confirm → ScanBookUseCase save.
 * Data adapters are wired in bootstrap.ts, not here.
 */
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { createIsbnLookup, openRepository } from "../bootstrap";
import { Acquisition, Book, ReadingStatus, Shelf } from "../domain";
import { DomainError } from "../domain/exceptions";
import {
  DeleteBookUseCase,
  FillMissingFactsUseCase,
  LookupIsbnUseCase,
  MoveBookToShelfUseCase,
  ScanBookUseCase,
  SetReadingStatusUseCase,
} from "../service";
import { BookMetadata, BookRepository } from "../service/ports";
import { Art, ArtFill } from "./Art";
import { BookCard } from "./BookCard";
import { MenuBar, MenuTab } from "./MenuBar";
import { IsbnCamera } from "./IsbnCamera";
import { CatalogMode } from "./catalog";
import { OwnedCatalog } from "./OwnedCatalog";
import { PromptModal } from "./PromptModal";
import { glowShadow, theme } from "./theme";

const OWNER_ID = "local";

type Screen = "main" | "detail";

type Prompt =
  | { kind: "scanConfirm"; metadata: BookMetadata; alreadyInLibrary: boolean }
  | { kind: "scanShelf"; metadata: BookMetadata }
  | { kind: "scanReading"; metadata: BookMetadata; shelf: Shelf }
  | { kind: "moveWanted" }
  | { kind: "acquire" }
  | { kind: "giftName" }
  | { kind: "moveOwnedReading"; acquisition: { type: Acquisition; giftedBy?: string } }
  | { kind: "delete"; book: Book };

function shelfTitle(value: Shelf): string {
  return value === Shelf.OWNED ? "Owned" : "Wanted";
}

function readingTitle(value: ReadingStatus): string {
  return value === ReadingStatus.READ ? "read" : "unread";
}

export function App() {
  return (
    <SafeAreaProvider>
      <LibraryApp />
    </SafeAreaProvider>
  );
}

function LibraryApp() {
  const insets = useSafeAreaInsets();
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [repository, setRepository] = useState<BookRepository | null>(null);
  const [tab, setTab] = useState<MenuTab>("tbr");
  const [screen, setScreen] = useState<Screen>("main");
  const [reading, setReading] = useState<ReadingStatus>(ReadingStatus.UNREAD);
  const [catalogMode, setCatalogMode] = useState<CatalogMode>("az");
  const [ownedBooks, setOwnedBooks] = useState<Book[]>([]);
  const [wantedBooks, setWantedBooks] = useState<Book[]>([]);
  const [tbrBooks, setTbrBooks] = useState<Book[]>([]);
  const [counts, setCounts] = useState<Record<"tbr" | "owned" | "wanted", number>>({
    tbr: 0,
    owned: 0,
    wanted: 0,
  });
  const [readingCounts, setReadingCounts] = useState<Record<ReadingStatus, number>>({
    UNREAD: 0,
    READ: 0,
  });
  const [selected, setSelected] = useState<Book | null>(null);
  const [isbn, setIsbn] = useState("");
  const [giftName, setGiftName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [flashTone, setFlashTone] = useState<"gold" | "danger">("gold");
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const selectedRef = useRef<Book | null>(null);
  selectedRef.current = selected;

  useEffect(() => {
    let cancelled = false;
    openRepository().then((opened) => {
      if (!cancelled) {
        setRepository(opened);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function flash(text: string, tone: "gold" | "danger" = "gold") {
    if (flashTimer.current) {
      clearTimeout(flashTimer.current);
    }
    setFlashTone(tone);
    setMessage(text);
    flashTimer.current = setTimeout(() => setMessage(null), 3000);
  }

  function flashCaught(error: unknown) {
    flash(
      error instanceof DomainError ? error.message : "Could not update the library.",
      error instanceof DomainError ? "gold" : "danger",
    );
  }

  function dismissFlash() {
    if (flashTimer.current) {
      clearTimeout(flashTimer.current);
    }
    setMessage(null);
  }

  const isbnLookup = useMemo(
    () => (repository ? createIsbnLookup(repository) : null),
    [repository],
  );
  const lookup = useMemo(
    () => (isbnLookup ? new LookupIsbnUseCase(isbnLookup) : null),
    [isbnLookup],
  );
  const scan = useMemo(
    () => (repository && isbnLookup ? new ScanBookUseCase(repository, isbnLookup) : null),
    [repository, isbnLookup],
  );
  const move = useMemo(
    () => (repository ? new MoveBookToShelfUseCase(repository) : null),
    [repository],
  );
  const setStatus = useMemo(
    () => (repository ? new SetReadingStatusUseCase(repository) : null),
    [repository],
  );
  const removeBook = useMemo(
    () => (repository ? new DeleteBookUseCase(repository) : null),
    [repository],
  );
  const fillMissing = useMemo(
    () =>
      repository && isbnLookup ? new FillMissingFactsUseCase(repository, isbnLookup) : null,
    [repository, isbnLookup],
  );

  async function refresh() {
    if (!repository) {
      return;
    }
    const library = await repository.loadLibrary(OWNER_ID);
    setOwnedBooks(library.booksOn(Shelf.OWNED));
    setWantedBooks(library.booksOn(Shelf.WANTED));
    setTbrBooks(library.booksOn(Shelf.OWNED, reading));
    setCounts({
      tbr: library.booksOn(Shelf.OWNED, ReadingStatus.UNREAD).length,
      owned: library.booksOn(Shelf.OWNED).length,
      wanted: library.booksOn(Shelf.WANTED).length,
    });
    setReadingCounts({
      UNREAD: library.booksOn(Shelf.OWNED, ReadingStatus.UNREAD).length,
      READ: library.booksOn(Shelf.OWNED, ReadingStatus.READ).length,
    });
    if (selectedRef.current) {
      try {
        setSelected(library.get(selectedRef.current.isbn));
      } catch {
        setSelected(null);
      }
    }
  }

  useEffect(() => {
    void refresh();
  }, [reading]);

  useEffect(() => {
    if (!fillMissing) {
      return;
    }
    let cancelled = false;
    setBusy(true);
    void (async () => {
      try {
        await fillMissing.execute(OWNER_ID);
        if (!cancelled) {
          await refresh();
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fillMissing]);

  async function onScan(code: string = isbn) {
    if (!lookup || !repository) {
      return;
    }
    setBusy(true);
    try {
      const metadata = await lookup.execute(code);
      setPrompt({
        kind: "scanConfirm",
        metadata,
        alreadyInLibrary: (await repository.loadLibrary(OWNER_ID)).books.some(
          (book) => book.isbn === metadata.isbn,
        ),
      });
    } catch (error) {
      flashCaught(error);
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmScan(metadata: BookMetadata, alreadyInLibrary: boolean) {
    if (alreadyInLibrary) {
      await finishScan(metadata, Shelf.OWNED, ReadingStatus.UNREAD);
      return;
    }
    setPrompt({ kind: "scanShelf", metadata });
  }

  async function finishScan(metadata: BookMetadata, shelf: Shelf, status: ReadingStatus) {
    if (!scan) {
      return;
    }
    setBusy(true);
    setPrompt(null);
    try {
      const book = await scan.execute(OWNER_ID, metadata.isbn, shelf, status);
      flash(
        book.copyCount > 1
          ? `${book.title} is already in your library. Copies: ${book.copyCount}.`
          : `Added ${book.title} to ${shelfTitle(book.shelf)} (${readingTitle(book.readingStatus)}).`,
      );
      setIsbn("");
      setTab(book.shelf === Shelf.OWNED ? "tbr" : "wanted");
      setReading(book.readingStatus);
      setScreen("main");
      await refresh();
    } catch (error) {
      flashCaught(error);
    } finally {
      setBusy(false);
    }
  }

  function onRejectScan() {
    setPrompt(null);
    setIsbn("");
    flash("Nothing added.");
  }

  async function finishMove(
    target: Shelf,
    status: ReadingStatus,
    acquisition?: { type: Acquisition; giftedBy?: string },
  ) {
    if (!move || !setStatus || !selected) {
      return;
    }
    setBusy(true);
    setPrompt(null);
    try {
      const book = await move.execute(OWNER_ID, selected.isbn, target, acquisition);
      await setStatus.execute(OWNER_ID, book.isbn, status);
      flash(`Moved to ${shelfTitle(target)} (${readingTitle(status)}).`);
      setGiftName("");
      setTab(target === Shelf.OWNED ? "owned" : "wanted");
      setScreen("main");
      await refresh();
    } catch (error) {
      flashCaught(error);
    } finally {
      setBusy(false);
    }
  }

  async function onReading(status: ReadingStatus) {
    if (!setStatus || !selected) {
      return;
    }
    setBusy(true);
    try {
      const book = await setStatus.execute(OWNER_ID, selected.isbn, status);
      setSelected(book);
      flash(status === ReadingStatus.READ ? "Marked read." : "Marked unread.");
      setReading(status);
      await refresh();
    } catch (error) {
      flashCaught(error);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(book: Book) {
    if (!removeBook) {
      return;
    }
    setBusy(true);
    setPrompt(null);
    try {
      await removeBook.execute(OWNER_ID, book.isbn);
      flash(`Removed ${book.title}.`);
      selectedRef.current = null;
      setSelected(null);
      setScreen("main");
      await refresh();
    } catch (error) {
      flashCaught(error);
    } finally {
      setBusy(false);
    }
  }

  function openBook(book: Book) {
    setSelected(book);
    setScreen("detail");
  }

  function onSelectTab(next: MenuTab) {
    setTab(next);
    setScreen("main");
  }

  if (!repository) {
    return (
      <View style={[styles.shell, { paddingTop: insets.top }]}>
        <ArtFill source={require("../assets/forest-bg.png")} />
        <View style={styles.loading}>
          <ActivityIndicator color={theme.glow} />
          <Text style={styles.muted}>Opening the stacks…</Text>
        </View>
      </View>
    );
  }

  const heading =
    screen === "detail"
      ? selected?.title ?? "Book"
      : tab === "scan"
        ? "Add a book"
        : tab === "tbr"
          ? "To be read"
          : tab === "owned"
            ? "Owned"
            : "Wanted";

  return (
    <View style={styles.shell}>
      <ArtFill source={require("../assets/forest-bg.png")} />
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.frame}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          {screen === "detail" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setScreen("main")}
              style={styles.back}
            >
              <Ionicons name="chevron-back" size={24} color={theme.glow} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.headerTop}>
              <Text style={styles.kicker}>MyHomeLib</Text>
            </View>
          )}
          <Text style={styles.h1}>{heading}</Text>
          {screen === "main" && tab === "tbr" ? (
            <Text style={styles.headerHint}>
              {readingCounts[reading]} {readingCounts[reading] === 1 ? "title" : "titles"} ·{" "}
              {reading === ReadingStatus.UNREAD ? "unread" : "read"}
            </Text>
          ) : null}
          {screen === "main" && tab === "owned" ? (
            <Text style={styles.headerHint}>
              {counts.owned} {counts.owned === 1 ? "title" : "titles"} owned
            </Text>
          ) : null}
          {screen === "main" && tab === "wanted" ? (
            <Text style={styles.headerHint}>
              {counts.wanted} {counts.wanted === 1 ? "title" : "titles"} wanted
            </Text>
          ) : null}
          {tab === "scan" && screen === "main" ? (
            <Text style={styles.headerHint}>
              Point the camera at an ISBN. Metadata from Open Library.
            </Text>
          ) : null}
        </View>
        {screen === "main" && tab === "tbr" ? (
          <View style={styles.segment}>
            {Object.values(ReadingStatus).map((status) => (
              <Pressable
                key={status}
                accessibilityRole="tab"
                style={styles.segmentTab}
                onPress={() => setReading(status)}
              >
                {status === ReadingStatus.READ ? (
                  <Ionicons name="leaf-outline" size={14} color={theme.glow} />
                ) : null}
                <Text style={[styles.segmentText, reading === status && styles.segmentTextOn]}>
                  {status === ReadingStatus.UNREAD ? "Unread" : "Read"} {readingCounts[status]}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {message ? (
          <Pressable
            onPress={dismissFlash}
            style={[styles.flash, flashTone === "danger" && styles.flashDanger]}
          >
            <Text
              style={[styles.flashText, flashTone === "danger" && styles.flashDangerText]}
            >
              {message}
            </Text>
            <Ionicons
              name="close"
              size={16}
              color={flashTone === "danger" ? theme.ink : theme.bg}
            />
          </Pressable>
        ) : null}
        {tab === "scan" && screen === "main" ? (
          <IsbnCamera
            listening={
              !busy &&
              prompt?.kind !== "scanConfirm" &&
              prompt?.kind !== "scanShelf" &&
              prompt?.kind !== "scanReading"
            }
            onIsbn={(code) => void onScan(code)}
          />
        ) : null}
        <View style={styles.listStage}>
        {tab === "owned" && screen === "main" ? (
          <OwnedCatalog
            books={ownedBooks}
            mode={catalogMode}
            onMode={setCatalogMode}
            onOpen={openBook}
          />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.main}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {tab === "scan" && screen === "main" ? (
              <View>
                <Text style={styles.label}>Or type the ISBN</Text>
                <TextInput
                  style={styles.input}
                  value={isbn}
                  onChangeText={setIsbn}
                  placeholder="9780140328721"
                  placeholderTextColor={theme.muted}
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
                <Pressable
                  accessibilityRole="button"
                  style={[styles.button, busy && styles.buttonOff]}
                  onPress={() => void onScan()}
                  disabled={busy}
                >
                  <Text style={styles.buttonText}>{busy ? "Working…" : "Add to library"}</Text>
                </Pressable>
              </View>
            ) : null}
            {tab === "tbr" && screen === "main" ? (
              <BookList
                books={tbrBooks}
                empty="Scan an ISBN onto Owned."
                onOpen={openBook}
                onScan={() => setTab("scan")}
              />
            ) : null}
            {tab === "wanted" && screen === "main" ? (
              <BookList
                books={wantedBooks}
                empty="Scan an ISBN onto Wanted."
                onOpen={openBook}
                onScan={() => setTab("scan")}
              />
            ) : null}
            {screen === "detail" && selected ? (
              <View>
                {selected.coverUrl ? (
                  <Art source={{ uri: selected.coverUrl }} style={styles.coverLarge} />
                ) : null}
                <View style={styles.detailCard}>
                  <Text style={styles.detailAuthor}>{selected.author}</Text>
                  <Text style={styles.meta}>
                    {selected.isbn} · {selected.copyCount}{" "}
                    {selected.copyCount === 1 ? "copy" : "copies"}
                  </Text>
                  <View style={styles.row}>
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>{shelfTitle(selected.shelf)}</Text>
                    </View>
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>
                        {selected.readingStatus === ReadingStatus.READ ? "Read" : "Unread"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.label}>Series</Text>
                  <Text style={styles.bodyCopy}>{selected.series.trim() || "Standalone"}</Text>
                  {selected.published ? (
                    <Text style={styles.bodyCopy}>Published {selected.published}</Text>
                  ) : null}
                  {selected.pageCount ? (
                    <Text style={styles.bodyCopy}>{selected.pageCount} pages</Text>
                  ) : null}
                  {selected.subjects ? <Text style={styles.bodyCopy}>{selected.subjects}</Text> : null}
                  {selected.description.trim() &&
                  !/^source title:/i.test(selected.description.trim()) ? (
                    <Text style={styles.bodyCopy}>{selected.description}</Text>
                  ) : (
                    <Text style={styles.bodyCopy}>No Open Library description for this edition.</Text>
                  )}
                  {selected.acquiredAs ? (
                    <Text style={styles.bodyCopy}>
                      {selected.acquiredAs}
                      {selected.giftedBy ? ` from ${selected.giftedBy}` : ""}
                    </Text>
                  ) : null}
                  <Text style={styles.label}>Reading</Text>
                  <Pressable
                    accessibilityRole="button"
                    style={styles.button}
                    onPress={() =>
                      void onReading(
                        selected.readingStatus === ReadingStatus.READ
                          ? ReadingStatus.UNREAD
                          : ReadingStatus.READ,
                      )
                    }
                  >
                    <Text style={styles.buttonText}>
                      {selected.readingStatus === ReadingStatus.READ ? "Mark unread" : "Mark read"}
                    </Text>
                  </Pressable>
                  <Text style={styles.label}>Owned or wanted</Text>
                  {selected.shelf === Shelf.WANTED ? (
                    <Pressable style={styles.button} onPress={() => setPrompt({ kind: "acquire" })}>
                      <Text style={styles.buttonText}>Move to Owned</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.ghostButton}
                      onPress={() => setPrompt({ kind: "moveWanted" })}
                    >
                      <Text style={styles.ghostButtonText}>Move to Wanted</Text>
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    style={styles.danger}
                    onPress={() => setPrompt({ kind: "delete", book: selected })}
                  >
                    <Text style={styles.dangerText}>Delete from library</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </ScrollView>
        )}
        </View>
        <MenuBar
          active={tab}
          bottomInset={insets.bottom}
          onSelect={onSelectTab}
        />
      </KeyboardAvoidingView>
      <PromptModal
        visible={prompt?.kind === "scanConfirm"}
        title={prompt?.kind === "scanConfirm" ? prompt.metadata.title : "Is this the book?"}
        coverUrl={prompt?.kind === "scanConfirm" ? prompt.metadata.coverUrl || "" : undefined}
        body={
          prompt?.kind === "scanConfirm"
            ? [
                prompt.metadata.author,
                prompt.metadata.isbn,
                [prompt.metadata.publisher, prompt.metadata.published].filter(Boolean).join(" · "),
                prompt.alreadyInLibrary
                  ? "Already in your library. Confirm to add another copy."
                  : "Nothing is saved until you confirm.",
              ]
                .filter(Boolean)
                .join("\n")
            : undefined
        }
        onRequestClose={onRejectScan}
        actions={[
          {
            label: "This is the book",
            onPress: () =>
              prompt?.kind === "scanConfirm"
                ? void onConfirmScan(prompt.metadata, prompt.alreadyInLibrary)
                : undefined,
          },
          { label: "Not this book", tone: "ghost", onPress: onRejectScan },
        ]}
      />
      <PromptModal
        visible={prompt?.kind === "scanShelf"}
        title="Where should it go?"
        body="Nothing is saved until you choose a shelf."
        onRequestClose={onRejectScan}
        actions={[
          {
            label: "Owned",
            onPress: () =>
              prompt?.kind === "scanShelf"
                ? setPrompt({ kind: "scanReading", metadata: prompt.metadata, shelf: Shelf.OWNED })
                : undefined,
          },
          {
            label: "Wanted",
            tone: "ghost",
            onPress: () =>
              prompt?.kind === "scanShelf"
                ? setPrompt({ kind: "scanReading", metadata: prompt.metadata, shelf: Shelf.WANTED })
                : undefined,
          },
        ]}
      />
      <PromptModal
        visible={prompt?.kind === "scanReading"}
        title="Have you read it?"
        body={`This copy will land on ${prompt?.kind === "scanReading" ? shelfTitle(prompt.shelf) : "the shelf"}.`}
        onRequestClose={onRejectScan}
        actions={[
          {
            label: "Unread",
            onPress: () =>
              prompt?.kind === "scanReading"
                ? void finishScan(prompt.metadata, prompt.shelf, ReadingStatus.UNREAD)
                : undefined,
          },
          {
            label: "Read",
            tone: "ghost",
            onPress: () =>
              prompt?.kind === "scanReading"
                ? void finishScan(prompt.metadata, prompt.shelf, ReadingStatus.READ)
                : undefined,
          },
        ]}
      />
      <PromptModal
        visible={prompt?.kind === "moveWanted"}
        title="Have you read it?"
        body="Then this title moves to Wanted."
        onRequestClose={() => setPrompt(null)}
        actions={[
          {
            label: "Unread",
            onPress: () => void finishMove(Shelf.WANTED, ReadingStatus.UNREAD),
          },
          {
            label: "Read",
            tone: "ghost",
            onPress: () => void finishMove(Shelf.WANTED, ReadingStatus.READ),
          },
        ]}
      />
      <PromptModal
        visible={prompt?.kind === "acquire"}
        title="How did you get it?"
        body="Wanted books can only move to Owned as a purchase or a gift."
        onRequestClose={() => setPrompt(null)}
        actions={[
          {
            label: "Purchased",
            onPress: () =>
              setPrompt({
                kind: "moveOwnedReading",
                acquisition: { type: Acquisition.PURCHASED },
              }),
          },
          {
            label: "Gifted",
            tone: "ghost",
            onPress: () => setPrompt({ kind: "giftName" }),
          },
        ]}
      />
      <PromptModal
        visible={prompt?.kind === "giftName"}
        title="Who gifted it?"
        body="Domain requires a name for a gifted copy."
        input={{ placeholder: "Name", value: giftName, onChangeText: setGiftName }}
        onRequestClose={() => setPrompt(null)}
        actions={[
          {
            label: "Continue",
            onPress: () =>
              setPrompt({
                kind: "moveOwnedReading",
                acquisition: { type: Acquisition.GIFTED, giftedBy: giftName },
              }),
          },
          { label: "Cancel", tone: "ghost", onPress: () => setPrompt(null) },
        ]}
      />
      <PromptModal
        visible={prompt?.kind === "moveOwnedReading"}
        title="Have you read it?"
        body="Then this title moves to Owned."
        onRequestClose={() => setPrompt(null)}
        actions={[
          {
            label: "Unread",
            onPress: () =>
              prompt?.kind === "moveOwnedReading"
                ? void finishMove(Shelf.OWNED, ReadingStatus.UNREAD, prompt.acquisition)
                : undefined,
          },
          {
            label: "Read",
            tone: "ghost",
            onPress: () =>
              prompt?.kind === "moveOwnedReading"
                ? void finishMove(Shelf.OWNED, ReadingStatus.READ, prompt.acquisition)
                : undefined,
          },
        ]}
      />
      <PromptModal
        visible={prompt?.kind === "delete"}
        title="Remove this title?"
        body={
          prompt?.kind === "delete"
            ? `Remove ${prompt.book.title} from your library? This deletes every copy.`
            : undefined
        }
        onRequestClose={() => setPrompt(null)}
        actions={[
          {
            label: "Delete",
            tone: "danger",
            onPress: () => (prompt?.kind === "delete" ? void onDelete(prompt.book) : undefined),
          },
          { label: "Keep it", tone: "ghost", onPress: () => setPrompt(null) },
        ]}
      />
    </View>
  );
}

function BookList({
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
  return (
    <View>
      {books.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="leaf-outline" size={36} color={theme.glow} />
          <Text style={styles.emptyTitle}>The shelf is quiet</Text>
          <Text style={styles.muted}>{empty}</Text>
          <Pressable style={styles.button} onPress={onScan}>
            <Text style={styles.buttonText}>Scan a book</Text>
          </Pressable>
        </View>
      ) : null}
      {books.map((book) => (
        <BookCard key={book.isbn} book={book} onOpen={onOpen} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: theme.bg },
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    minHeight: 0,
  },
  listStage: { flex: 1, minHeight: 0 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 2, zIndex: 1 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: theme.ink,
    textShadowColor: theme.glow,
    textShadowRadius: 10,
  },
  h1: {
    fontFamily: theme.serif,
    fontSize: 34,
    fontWeight: "700",
    color: theme.ink,
    letterSpacing: -0.3,
    marginTop: -4,
    textShadowColor: theme.glow,
    textShadowRadius: 12,
  },
  back: { flexDirection: "row", alignItems: "center", marginLeft: -6, minHeight: 44 },
  backText: { fontSize: 16, fontWeight: "600", color: theme.glow },
  muted: { color: theme.muted, fontSize: 15, lineHeight: 22 },
  headerHint: {
    color: theme.ink,
    fontSize: 15,
    lineHeight: 22,
    textShadowColor: theme.glow,
    textShadowRadius: 10,
  },
  bodyCopy: { color: theme.ink, fontSize: 15, lineHeight: 22, marginTop: 8 },
  detailCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
    ...glowShadow,
  },
  ghostButton: {
    backgroundColor: "transparent",
    padding: 16,
    borderRadius: 14,
    marginTop: 12,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.gold,
  },
  ghostButtonText: { color: theme.gold, fontSize: 16, fontWeight: "700" },
  scroll: { flex: 1, minHeight: 0, backgroundColor: "transparent" },
  main: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  segment: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 10,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    zIndex: 1,
  },
  segmentText: { fontWeight: "600", color: theme.muted, fontSize: 15 },
  segmentTextOn: { color: theme.ink, fontFamily: theme.serif, fontSize: 16 },
  flash: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: theme.gold,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  flashText: { flex: 1, color: theme.bg, fontWeight: "600" },
  flashDanger: { backgroundColor: theme.danger },
  flashDangerText: { color: theme.ink },
  label: { marginTop: 8, marginBottom: 6, fontWeight: "700", color: theme.gold },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: theme.card,
    color: theme.ink,
    minHeight: 52,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 4 },
  chip: {
    backgroundColor: theme.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.border,
    minHeight: 44,
    justifyContent: "center",
  },
  chipOn: { borderColor: theme.gold, backgroundColor: theme.pine },
  chipText: { color: theme.muted, fontWeight: "600" },
  chipTextOn: { color: theme.gold },
  button: {
    backgroundColor: theme.gold,
    padding: 16,
    borderRadius: 14,
    marginTop: 12,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonOff: { opacity: 0.6 },
  buttonText: { color: theme.bg, fontSize: 16, fontWeight: "700" },
  danger: {
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.danger,
  },
  dangerText: { color: theme.danger, fontSize: 16, fontWeight: "700" },
  coverLarge: {
    width: 112,
    height: 164,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: theme.pine,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: theme.glow,
    overflow: "hidden",
  },
  meta: { color: theme.gold, fontSize: 13, marginTop: 2 },
  detailAuthor: { fontFamily: theme.serif, fontSize: 18, color: theme.ink, marginBottom: 4 },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: theme.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pillText: { color: theme.gold, fontWeight: "700", fontSize: 12 },
  empty: {
    backgroundColor: "rgba(21,32,51,0.55)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyTitle: { fontFamily: theme.serif, fontSize: 20, fontWeight: "700", color: theme.gold },
});
