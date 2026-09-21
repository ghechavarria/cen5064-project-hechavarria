/**
 * Data: Memory/JSON BookRepository adapters plus row mapping.
 * Implements the BookRepository port; no React.
 */
import { Acquisition, Book, PersonalLibrary, ReadingStatus, Shelf } from "../domain";
import { BookMetadata, BookRepository } from "../service/ports";

export type BookRow = {
  ownerId: string;
  isbn: string;
  title: string;
  author: string;
  coverUrl: string;
  publisher: string;
  shelf: Shelf;
  copyCount: number;
  acquiredAs: Acquisition | null;
  giftedBy: string | null;
  readingStatus: ReadingStatus;
  series: string;
  description: string;
  published: string;
  pageCount: number;
  subjects: string;
  id: number;
};

export function migrateLegacyShelf(shelf: string): Shelf {
  return shelf === "TBR" ? Shelf.OWNED : (shelf as Shelf);
}

function withFacts(row: Partial<BookRow> & BookRow): BookRow {
  return {
    ...row,
    series: row.series || (row as BookRow & { collection?: string }).collection || "",
    description: row.description ?? "",
    published: row.published ?? "",
    pageCount: row.pageCount ?? 0,
    subjects: row.subjects ?? "",
  };
}

export function toBook(row: BookRow): Book {
  return new Book(
    row.isbn,
    row.title,
    row.author,
    row.coverUrl,
    row.publisher,
    migrateLegacyShelf(String(row.shelf)),
    row.copyCount,
    row.acquiredAs,
    row.giftedBy,
    row.readingStatus ?? ReadingStatus.UNREAD,
    row.series ?? "",
    row.description ?? "",
    row.published ?? "",
    row.pageCount ?? 0,
    row.subjects ?? "",
    row.id,
  );
}

export function toRow(ownerId: string, book: Book, id: number): BookRow {
  return {
    ownerId,
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    publisher: book.publisher,
    shelf: book.shelf,
    copyCount: book.copyCount,
    acquiredAs: book.acquiredAs,
    giftedBy: book.giftedBy,
    readingStatus: book.readingStatus,
    series: book.series,
    description: book.description,
    published: book.published,
    pageCount: book.pageCount,
    subjects: book.subjects,
    id,
  };
}

function emptyMetadata(row: Partial<BookMetadata> & Pick<BookMetadata, "isbn" | "title" | "author" | "coverUrl" | "publisher">): BookMetadata {
  return {
    isbn: row.isbn,
    title: row.title,
    author: row.author,
    coverUrl: row.coverUrl,
    publisher: row.publisher,
    series: row.series ?? "",
    description: row.description ?? "",
    published: row.published ?? "",
    pageCount: row.pageCount ?? 0,
    subjects: row.subjects ?? "",
  };
}

export class MemoryBookRepository implements BookRepository {
  private books: BookRow[] = [];
  private isbnCache: Record<string, BookMetadata> = {};
  private nextId = 1;

  dump(): {
    books: BookRow[];
    isbnCache: Record<string, BookMetadata>;
    nextId: number;
  } {
    return {
      books: this.books,
      isbnCache: this.isbnCache,
      nextId: this.nextId,
    };
  }

  restore(snapshot: {
    books: BookRow[];
    isbnCache: Record<string, BookMetadata>;
    nextId: number;
  }): void {
    this.books = snapshot.books.map((row) =>
      withFacts({
        ...row,
        shelf: migrateLegacyShelf(String(row.shelf)),
        readingStatus: row.readingStatus ?? ReadingStatus.UNREAD,
      }),
    );
    this.isbnCache = Object.fromEntries(
      Object.entries(snapshot.isbnCache).map(([isbn, metadata]) => [isbn, emptyMetadata(metadata)]),
    );
    this.nextId = snapshot.nextId;
  }

  async loadLibrary(ownerId: string): Promise<PersonalLibrary> {
    return new PersonalLibrary(
      ownerId,
      this.books.filter((row) => row.ownerId === ownerId).map(toBook),
    );
  }

  async save(ownerId: string, book: Book): Promise<Book> {
    const existing = this.books.findIndex(
      (row) => row.ownerId === ownerId && row.isbn === book.isbn,
    );
    if (existing >= 0) {
      this.books[existing] = toRow(ownerId, book, this.books[existing].id);
      book.setId(this.books[existing].id);
      return book;
    }
    this.books.push(toRow(ownerId, book, this.nextId));
    book.setId(this.nextId);
    this.nextId += 1;
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

const STORAGE_KEY = "myhomelib.library.v1";

export class JsonBookRepository implements BookRepository {
  private readonly memory = new MemoryBookRepository();
  private loaded = false;

  constructor(
    private readonly storage: {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
    } | null,
  ) {}

  private persist(): void {
    if (!this.storage) {
      return;
    }
    this.storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...this.memory.dump(), cacheParser: 2 }),
    );
  }

  private hydrate(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    const raw = this.storage?.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const snapshot = JSON.parse(raw) as ReturnType<MemoryBookRepository["dump"]> & {
      cacheParser?: number;
    };
    this.memory.restore(
      snapshot.cacheParser === 2 ? snapshot : { ...snapshot, isbnCache: {} },
    );
    if (snapshot.cacheParser !== 2) {
      this.persist();
    }
  }

  async loadLibrary(ownerId: string): Promise<PersonalLibrary> {
    this.hydrate();
    return this.memory.loadLibrary(ownerId);
  }

  async save(ownerId: string, book: Book): Promise<Book> {
    this.hydrate();
    const saved = await this.memory.save(ownerId, book);
    this.persist();
    return saved;
  }

  async delete(ownerId: string, isbn: string): Promise<void> {
    this.hydrate();
    await this.memory.delete(ownerId, isbn);
    this.persist();
  }

  async cachedIsbn(isbn: string): Promise<BookMetadata | null> {
    this.hydrate();
    return this.memory.cachedIsbn(isbn);
  }

  async cacheIsbn(metadata: BookMetadata): Promise<void> {
    this.hydrate();
    await this.memory.cacheIsbn(metadata);
    this.persist();
  }
}
