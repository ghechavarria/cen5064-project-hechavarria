/**
 * Data: BookRowMapper — the single translation between a stored row and a
 * domain Book (Data Mapper pattern). The Memory, JSON, and SQLite adapters all
 * use it, so the column ↔ field list exists in one place only.
 * Domain never sees rows.
 */
import { Acquisition, AcquisitionRecord, Book, BookFormat, BookProps, ReadingStatus, Shelf } from "../domain";
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

/** A row as an older build may have stored it: newer fields can be missing. */
type StoredRow = Partial<BookRow> &
  Pick<BookRow, "ownerId" | "isbn" | "title" | "author" | "coverUrl" | "publisher" | "shelf" | "copyCount"> & {
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

  // Any stored row (JSON or SQLite, old or new) → a complete BookRow. Older builds
  // had a third "TBR" shelf (now Owned + unread) and lacked the newer fact columns.
  static withDefaults(row: StoredRow): BookRow {
    const { collection, ...stored } = row;
    return {
      ...stored,
      shelf: String(row.shelf) === "TBR" ? Shelf.OWNED : row.shelf,
      acquiredAs: row.acquiredAs || null,
      giftedBy: row.giftedBy || null,
      readingStatus: row.readingStatus ?? ReadingStatus.UNREAD,
      series: row.series || collection || "",
      description: row.description ?? "",
      published: row.published ?? "",
      pageCount: row.pageCount ?? 0,
      subjects: row.subjects ?? "",
      format: row.format || BookFormat.UNKNOWN,
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
}
