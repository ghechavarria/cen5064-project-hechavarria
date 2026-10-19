/**
 * Data: BookRowMapper — the single translation between a stored row and a
 * domain Book (Data Mapper pattern). The Memory, JSON, and SQLite adapters all
 * use it, so the column ↔ field list and the rules for old or damaged rows
 * exist in one place only. Domain never sees rows.
 */
import { Acquisition, AcquisitionRecord, Book, BookFormat, BookProps, Isbn, ReadingStatus, Shelf } from "../domain";
import { BookMetadata } from "../service/ports";

/**
 * One stored book, flat and serializable (what JSON and SQLite hold): every
 * Book field, with the acquisition flattened into two columns, plus its owner.
 */
export type BookRow = Required<Omit<BookProps, "acquisition">> & {
  ownerId: string;
  acquiredAs: Acquisition | null;
  giftedBy: string | null;
};

/**
 * A row as an older build (or a damaged file) may have stored it: only the
 * owner and ISBN are required; anything else may be missing or malformed.
 */
export type StoredRow = Partial<BookRow> &
  Pick<BookRow, "ownerId" | "isbn"> & {
    collection?: string; // what older builds called the series
  };

export class BookRowMapper {
  // Row → Book. Rebuilds the right AcquisitionRecord subclass from its columns.
  static toBook(row: BookRow): Book {
    return new Book({ ...row, acquisition: AcquisitionRecord.restore(row.acquiredAs, row.giftedBy) });
  }

  // Book → row, ready to store.
  static toRow(ownerId: string, book: Book): BookRow {
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
      format: book.format,
    };
  }

  // A row can be restored only if it still says whose book it is and which ISBN;
  // anything else (null, a string, a row missing those keys) is skipped on load.
  static isUsable(row: unknown): row is StoredRow {
    const candidate = row as Partial<StoredRow> | null;
    return (
      typeof candidate === "object" &&
      candidate !== null &&
      BookRowMapper.text(candidate.ownerId) !== "" &&
      BookRowMapper.text(candidate.isbn) !== ""
    );
  }

  // Any stored row (JSON or SQLite, old or new) → a complete, valid BookRow.
  //  - older builds had a third "TBR" shelf (now Owned + unread) and called the series "collection";
  //  - newer fact columns may be missing;
  //  - values outside an enum, or of the wrong type, fall back to the safe default.
  static withDefaults(row: StoredRow): BookRow {
    const acquiredAs = BookRowMapper.oneOf(Object.values(Acquisition), row.acquiredAs, null);
    return {
      ownerId: BookRowMapper.text(row.ownerId),
      isbn: BookRowMapper.isbnKey(row.isbn),
      title: BookRowMapper.text(row.title) || "Untitled",
      author: BookRowMapper.text(row.author) || "Unknown",
      coverUrl: BookRowMapper.text(row.coverUrl),
      publisher: BookRowMapper.text(row.publisher),
      shelf: String(row.shelf) === "TBR" ? Shelf.OWNED : BookRowMapper.oneOf(Object.values(Shelf), row.shelf, Shelf.WANTED),
      copyCount: Math.max(1, Math.floor(Number(row.copyCount)) || 1),
      acquiredAs,
      giftedBy: acquiredAs === Acquisition.GIFTED ? BookRowMapper.text(row.giftedBy) || null : null,
      readingStatus: BookRowMapper.oneOf(Object.values(ReadingStatus), row.readingStatus, ReadingStatus.UNREAD),
      series: BookRowMapper.text(row.series) || BookRowMapper.text(row.collection),
      description: BookRowMapper.text(row.description),
      published: BookRowMapper.text(row.published),
      pageCount: Math.max(0, Math.floor(Number(row.pageCount)) || 0),
      subjects: BookRowMapper.text(row.subjects),
      format: BookRowMapper.oneOf(Object.values(BookFormat), row.format, BookFormat.UNKNOWN),
    };
  }

  // Cached ISBN metadata saved by older builds may lack the newer fields.
  static metadataWithDefaults(
    metadata: Partial<BookMetadata> &
      Pick<BookMetadata, "isbn" | "title" | "author" | "coverUrl" | "publisher">,
  ): BookMetadata {
    return {
      ...metadata,
      coverCandidates: metadata.coverCandidates ?? (metadata.coverUrl ? [metadata.coverUrl] : []),
      format: metadata.format ?? BookFormat.UNKNOWN,
      series: metadata.series ?? "",
      description: metadata.description ?? "",
      published: metadata.published ?? "",
      pageCount: metadata.pageCount ?? 0,
      subjects: metadata.subjects ?? "",
    };
  }

  // A JSON array of cover URLs as stored in SQLite; anything unreadable counts as none.
  static coverList(stored: unknown): string[] {
    try {
      const parsed: unknown = JSON.parse(String(stored ?? "[]"));
      return Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === "string") : [];
    } catch {
      return [];
    }
  }

  // Rows saved before the library keyed books by ISBN-13 may hold a typed
  // ISBN-10; it becomes its ISBN-13. Anything that isn't an ISBN is kept as stored.
  static isbnKey(stored: unknown): string {
    const isbn = BookRowMapper.text(stored);
    return Isbn.isValid(isbn) ? Isbn.canonical(isbn) : isbn;
  }

  // A trimmed string; null, undefined, and non-strings read as "".
  private static text(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
  }

  // The stored value if it is one of the allowed enum values, otherwise the fallback.
  private static oneOf<T extends string, F>(allowed: T[], value: unknown, fallback: F): T | F {
    return allowed.includes(value as T) ? (value as T) : fallback;
  }
}
