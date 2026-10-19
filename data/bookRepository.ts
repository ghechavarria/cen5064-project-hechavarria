/**
 * Data: MemoryBookRepository (tests, and the store behind JSON) and
 * JsonBookRepository (Expo web: browser localStorage). Both implement the
 * BookRepository port; row ↔ Book conversion is BookRowMapper's job.
 */
import { Book, PersonalLibrary } from "../domain";
import { BookMetadata, BookRepository } from "../service/ports";
import { BookRow, BookRowMapper, StoredRow } from "./bookRowMapper";

/** Everything the memory store holds; JSON saves exactly this. */
type Snapshot = { books: BookRow[]; isbnCache: Record<string, BookMetadata> };

/** A snapshot as read back from storage: possibly from an older build, possibly damaged. */
type StoredSnapshot = { books?: StoredRow[]; isbnCache?: Snapshot["isbnCache"] };

/** In-memory store: rows in an array, ISBN cache in a map. */
export class MemoryBookRepository implements BookRepository {
  private books: BookRow[] = [];
  private isbnCache: Record<string, BookMetadata> = {};

  dump(): Snapshot {
    return { books: this.books, isbnCache: this.isbnCache };
  }

  // Rows and cache entries saved by older builds get today's defaults; rows too
  // damaged to say whose book or which ISBN they are, are skipped.
  restore(snapshot: StoredSnapshot): void {
    const books: unknown[] = Array.isArray(snapshot.books) ? snapshot.books : [];
    this.books = MemoryBookRepository.mergeSameBook(
      books.filter(BookRowMapper.isUsable).map((row) => BookRowMapper.withDefaults(row)),
    );
    const cache = snapshot.isbnCache && typeof snapshot.isbnCache === "object" ? snapshot.isbnCache : {};
    this.isbnCache = Object.fromEntries(
      Object.entries(cache).map(([isbn, metadata]) => [isbn, BookRowMapper.metadataWithDefaults(metadata)]),
    );
  }

  // An old save may hold one book twice (typed as ISBN-10, later scanned as
  // ISBN-13; both now map to the same key). Keep the first row and add the copies.
  private static mergeSameBook(rows: BookRow[]): BookRow[] {
    const byKey = new Map<string, BookRow>();
    for (const row of rows) {
      const key = `${row.ownerId}\u0000${row.isbn}`;
      const first = byKey.get(key);
      if (first) {
        first.copyCount += row.copyCount;
      } else {
        byKey.set(key, { ...row });
      }
    }
    return [...byKey.values()];
  }

  async loadLibrary(ownerId: string): Promise<PersonalLibrary> {
    return new PersonalLibrary(
      this.books.filter((row) => row.ownerId === ownerId).map(BookRowMapper.toBook),
    );
  }

  // Insert, or replace the row with the same owner and ISBN.
  async save(ownerId: string, book: Book): Promise<Book> {
    const row = BookRowMapper.toRow(ownerId, book);
    const existing = this.books.findIndex(
      (stored) => stored.ownerId === ownerId && stored.isbn === book.isbn,
    );
    if (existing >= 0) {
      this.books[existing] = row;
    } else {
      this.books.push(row);
    }
    return book;
  }

  async delete(ownerId: string, isbn: string): Promise<void> {
    this.books = this.books.filter((row) => !(row.ownerId === ownerId && row.isbn === isbn));
  }

  async cachedIsbn(isbn: string): Promise<BookMetadata | null> {
    return this.isbnCache[isbn] ?? null;
  }

  async cacheIsbn(metadata: BookMetadata): Promise<void> {
    this.isbnCache[metadata.isbn] = metadata;
  }
}

/** The part of browser localStorage this repository needs. */
type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const STORAGE_KEY = "myhomelib.library.v1";
// Where an unreadable save is kept, untouched, before the app starts over with an empty library.
const BACKUP_KEY = `${STORAGE_KEY}.unreadable`;
// Bumped when the lookup sources change (4: edition-first + Google Books with
// cover-by-ISBN); cached lookups from an older version are dropped and fetched again.
const CACHE_PARSER_VERSION = 4;

/**
 * localStorage store. Composition: it wraps a MemoryBookRepository, loads it
 * once from storage (hydrate) and writes it back after every change (persist).
 */
export class JsonBookRepository implements BookRepository {
  private readonly memory = new MemoryBookRepository();
  private loaded = false;

  constructor(private readonly storage: KeyValueStorage) {}

  loadLibrary(ownerId: string): Promise<PersonalLibrary> {
    return this.read(() => this.memory.loadLibrary(ownerId));
  }

  save(ownerId: string, book: Book): Promise<Book> {
    return this.write(() => this.memory.save(ownerId, book));
  }

  delete(ownerId: string, isbn: string): Promise<void> {
    return this.write(() => this.memory.delete(ownerId, isbn));
  }

  cachedIsbn(isbn: string): Promise<BookMetadata | null> {
    return this.read(() => this.memory.cachedIsbn(isbn));
  }

  cacheIsbn(metadata: BookMetadata): Promise<void> {
    return this.write(() => this.memory.cacheIsbn(metadata));
  }

  // Every read first makes sure storage has been loaded.
  private async read<T>(work: () => Promise<T>): Promise<T> {
    this.hydrate();
    return work();
  }

  // Every write is a read that is saved back to storage afterwards.
  private async write<T>(work: () => Promise<T>): Promise<T> {
    const result = await this.read(work);
    this.persist();
    return result;
  }

  private hydrate(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const snapshot = JsonBookRepository.parse(raw);
    if (!snapshot) {
      // Corrupted (half-written or hand-edited): keep a copy instead of crashing at start-up.
      this.storage.setItem(BACKUP_KEY, raw);
      this.persist();
      return;
    }
    const current = snapshot.cacheParser === CACHE_PARSER_VERSION;
    this.memory.restore(current ? snapshot : { ...snapshot, isbnCache: {} });
    if (!current) {
      this.persist();
    }
  }

  // The stored JSON as a snapshot, or null when it isn't a JSON object at all.
  private static parse(raw: string): (StoredSnapshot & { cacheParser?: number }) | null {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private persist(): void {
    this.storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...this.memory.dump(), cacheParser: CACHE_PARSER_VERSION }),
    );
  }
}
