/**
 * Data: MemoryBookRepository (tests, and the store behind JSON) and
 * JsonBookRepository (Expo web: browser localStorage). Both implement the
 * BookRepository, IsbnCache and SyncStore ports; row ↔ Book conversion is BookRowMapper's job.
 */
import { Book, PersonalLibrary } from "../domain";
import { BookMetadata, BookRepository, BookVersion, IsbnCache, SyncStore } from "../service/ports";
import { BookRow, BookRowMapper, StoredRow } from "./bookRowMapper";

/** Everything the memory store holds; JSON saves exactly this. */
type Snapshot = { books: BookRow[]; isbnCache: Record<string, BookMetadata> };

/** A snapshot as read back from storage: possibly from an older build, possibly damaged. */
type StoredSnapshot = { books?: StoredRow[]; isbnCache?: Snapshot["isbnCache"] };

/** Milliseconds since 1970; injectable so tests control the sync timestamps. */
export type Clock = () => number;

/**
 * In-memory store: rows in an array, ISBN cache in a map. A delete keeps the row
 * as a tombstone (deletedAt), so sync can tell other phones; loading skips it.
 */
export class MemoryBookRepository implements BookRepository, IsbnCache, SyncStore {
  private books: BookRow[] = [];
  private isbnCache: Record<string, BookMetadata> = {};

  constructor(private readonly clock: Clock = Date.now) {}

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
      this.books.filter((row) => row.ownerId === ownerId && row.deletedAt === null).map(BookRowMapper.toBook),
    );
  }

  // Insert, or replace the row with the same owner and ISBN (reviving a deleted one).
  async save(ownerId: string, book: Book): Promise<Book> {
    this.put(BookRowMapper.toRow(ownerId, book, this.clock()));
    return book;
  }

  // Soft delete: the row stays as a tombstone so the deletion syncs.
  async delete(ownerId: string, isbn: string): Promise<void> {
    const row = this.find(ownerId, isbn);
    if (row && row.deletedAt === null) {
      const now = this.clock();
      this.put({ ...row, updatedAt: now, deletedAt: now });
    }
  }

  async versions(ownerId: string): Promise<BookVersion[]> {
    return this.books.filter((row) => row.ownerId === ownerId).map(BookRowMapper.toVersion);
  }

  // A version replaces the stored row only if it is newer, so a change made
  // while a sync was running is never overwritten by an older copy.
  async applyVersions(ownerId: string, versions: BookVersion[]): Promise<void> {
    for (const version of versions) {
      const stored = this.find(ownerId, version.book.isbn);
      if (!stored || version.updatedAt > stored.updatedAt) {
        this.put(BookRowMapper.fromVersion(ownerId, version));
      }
    }
  }

  private find(ownerId: string, isbn: string): BookRow | undefined {
    return this.books.find((row) => row.ownerId === ownerId && row.isbn === isbn);
  }

  private put(row: BookRow): void {
    const index = this.books.findIndex((stored) => stored.ownerId === row.ownerId && stored.isbn === row.isbn);
    if (index >= 0) {
      this.books[index] = row;
    } else {
      this.books.push(row);
    }
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
export class JsonBookRepository implements BookRepository, IsbnCache, SyncStore {
  private readonly memory: MemoryBookRepository;
  private loaded = false;

  constructor(
    private readonly storage: KeyValueStorage,
    clock: Clock = Date.now,
  ) {
    this.memory = new MemoryBookRepository(clock);
  }

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

  versions(ownerId: string): Promise<BookVersion[]> {
    return this.read(() => this.memory.versions(ownerId));
  }

  applyVersions(ownerId: string, versions: BookVersion[]): Promise<void> {
    return this.write(() => this.memory.applyVersions(ownerId, versions));
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
