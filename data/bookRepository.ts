/**
 * Data: MemoryBookRepository (tests, and the store behind JSON) and
 * JsonBookRepository (Expo web: browser localStorage). Both implement the
 * BookRepository port; row ↔ Book conversion is BookRowMapper's job.
 */
import { Book, PersonalLibrary } from "../domain";
import { BookMetadata, BookRepository } from "../service/ports";
import { BookRow, BookRowMapper } from "./bookRowMapper";

/** Everything the memory store holds; JSON saves exactly this. */
type Snapshot = { books: BookRow[]; isbnCache: Record<string, BookMetadata> };

/** In-memory store: rows in an array, ISBN cache in a map. */
export class MemoryBookRepository implements BookRepository {
  private books: BookRow[] = [];
  private isbnCache: Record<string, BookMetadata> = {};

  dump(): Snapshot {
    return { books: this.books, isbnCache: this.isbnCache };
  }

  // Rows and cache entries saved by older builds get today's defaults.
  restore(snapshot: Snapshot): void {
    this.books = snapshot.books.map((row) => BookRowMapper.withDefaults(row));
    this.isbnCache = Object.fromEntries(
      Object.entries(snapshot.isbnCache).map(([isbn, metadata]) => [
        isbn,
        BookRowMapper.metadataWithDefaults(metadata),
      ]),
    );
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
    const snapshot = JSON.parse(raw) as Snapshot & { cacheParser?: number };
    const current = snapshot.cacheParser === CACHE_PARSER_VERSION;
    this.memory.restore(current ? snapshot : { ...snapshot, isbnCache: {} });
    if (!current) {
      this.persist();
    }
  }

  private persist(): void {
    this.storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...this.memory.dump(), cacheParser: CACHE_PARSER_VERSION }),
    );
  }
}
