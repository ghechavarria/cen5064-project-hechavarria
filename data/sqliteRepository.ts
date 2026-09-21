/**
 * Data: SqliteBookRepository implements the BookRepository port on device.
 * Service and Presentation must not import expo-sqlite; bootstrap.ts opens this adapter.
 */
import * as SQLite from "expo-sqlite";
import { Acquisition, Book, PersonalLibrary, ReadingStatus } from "../domain";
import { BookMetadata, BookRepository } from "../service/ports";
import { BookRow, migrateLegacyShelf, toBook, toRow } from "./bookRepository";

export class SqliteBookRepository implements BookRepository {
  private queue: Promise<void> = Promise.resolve();

  private constructor(private readonly db: SQLite.SQLiteDatabase) {}

  static async open(): Promise<SqliteBookRepository> {
    const db = await SQLite.openDatabaseAsync("myhomelib.db", { useNewConnection: true });
    const repo = new SqliteBookRepository(db);
    await repo.migrate();
    return repo;
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = this.queue.then(work, work);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async migrate(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id TEXT NOT NULL,
        isbn TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        cover_url TEXT NOT NULL,
        publisher TEXT NOT NULL,
        shelf TEXT NOT NULL,
        copy_count INTEGER NOT NULL,
        acquired_as TEXT,
        gifted_by TEXT,
        reading_status TEXT NOT NULL DEFAULT 'UNREAD',
        series TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        published TEXT NOT NULL DEFAULT '',
        page_count INTEGER NOT NULL DEFAULT 0,
        subjects TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS isbn_cache (
        isbn TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        cover_url TEXT NOT NULL,
        publisher TEXT NOT NULL,
        series TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        published TEXT NOT NULL DEFAULT '',
        page_count INTEGER NOT NULL DEFAULT 0,
        subjects TEXT NOT NULL DEFAULT '',
        parser_v2 INTEGER NOT NULL DEFAULT 1
      );
    `);
    const bookColumns = await this.db.getAllAsync<{ name: string }>("PRAGMA table_info(books)");
    const cacheColumns = await this.db.getAllAsync<{ name: string }>("PRAGMA table_info(isbn_cache)");
    await this.addColumn(bookColumns, "reading_status", `ALTER TABLE books ADD COLUMN reading_status TEXT NOT NULL DEFAULT 'UNREAD';`);
    await this.addColumn(bookColumns, "collection", `ALTER TABLE books ADD COLUMN collection TEXT NOT NULL DEFAULT '';`);
    await this.addColumn(bookColumns, "series", `ALTER TABLE books ADD COLUMN series TEXT NOT NULL DEFAULT '';`);
    await this.addColumn(bookColumns, "description", `ALTER TABLE books ADD COLUMN description TEXT NOT NULL DEFAULT '';`);
    await this.addColumn(bookColumns, "published", `ALTER TABLE books ADD COLUMN published TEXT NOT NULL DEFAULT '';`);
    await this.addColumn(bookColumns, "page_count", `ALTER TABLE books ADD COLUMN page_count INTEGER NOT NULL DEFAULT 0;`);
    await this.addColumn(bookColumns, "subjects", `ALTER TABLE books ADD COLUMN subjects TEXT NOT NULL DEFAULT '';`);
    await this.addColumn(cacheColumns, "series", `ALTER TABLE isbn_cache ADD COLUMN series TEXT NOT NULL DEFAULT '';`);
    await this.addColumn(cacheColumns, "description", `ALTER TABLE isbn_cache ADD COLUMN description TEXT NOT NULL DEFAULT '';`);
    await this.addColumn(cacheColumns, "published", `ALTER TABLE isbn_cache ADD COLUMN published TEXT NOT NULL DEFAULT '';`);
    await this.addColumn(cacheColumns, "page_count", `ALTER TABLE isbn_cache ADD COLUMN page_count INTEGER NOT NULL DEFAULT 0;`);
    await this.addColumn(cacheColumns, "subjects", `ALTER TABLE isbn_cache ADD COLUMN subjects TEXT NOT NULL DEFAULT '';`);
    if (!cacheColumns.some((column) => column.name === "parser_v2")) {
      await this.db.execAsync(`ALTER TABLE isbn_cache ADD COLUMN parser_v2 INTEGER NOT NULL DEFAULT 1;`);
      await this.db.execAsync(`DELETE FROM isbn_cache;`);
    }
    await this.db.execAsync(
      `UPDATE books SET shelf = 'OWNED', reading_status = 'UNREAD' WHERE shelf = 'TBR';`,
    );
    try {
      await this.db.execAsync(
        `UPDATE books SET series = collection WHERE (series IS NULL OR series = '') AND collection IS NOT NULL AND collection != '';`,
      );
    } catch {
      /* collection column absent on some schemas */
    }
  }

  private async addColumn(
    columns: { name: string }[],
    name: string,
    sql: string,
  ): Promise<void> {
    if (!columns.some((column) => column.name === name)) {
      await this.db.execAsync(sql);
    }
  }

  async loadLibrary(ownerId: string): Promise<PersonalLibrary> {
    return this.enqueue(async () => {
      const rows = await this.db.getAllAsync<Record<string, unknown>>(
        "SELECT * FROM books WHERE owner_id = ?",
        [ownerId],
      );
      return new PersonalLibrary(ownerId, rows.map((row) => toBook(this.mapRow(row))));
    });
  }

  async save(ownerId: string, book: Book): Promise<Book> {
    return this.enqueue(async () => {
      const existing = await this.db.getFirstAsync<{ id: number }>(
        "SELECT id FROM books WHERE isbn = ?",
        [book.isbn],
      );
      if (existing) {
        await this.db.runAsync(
          `UPDATE books SET title=?, author=?, cover_url=?, publisher=?, shelf=?, copy_count=?, acquired_as=?, gifted_by=?, reading_status=?, series=?, description=?, published=?, page_count=?, subjects=? WHERE isbn=?`,
          [
            book.title,
            book.author,
            book.coverUrl,
            book.publisher,
            book.shelf,
            book.copyCount,
            book.acquiredAs ?? "",
            book.giftedBy ?? "",
            book.readingStatus,
            book.series,
            book.description,
            book.published,
            book.pageCount,
            book.subjects,
            book.isbn,
          ],
        );
        book.setId(existing.id);
        return book;
      }
      const result = await this.db.runAsync(
        `INSERT INTO books (owner_id, isbn, title, author, cover_url, publisher, shelf, copy_count, acquired_as, gifted_by, reading_status, series, description, published, page_count, subjects)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ownerId,
          book.isbn,
          book.title,
          book.author,
          book.coverUrl,
          book.publisher,
          book.shelf,
          book.copyCount,
          book.acquiredAs ?? "",
          book.giftedBy ?? "",
          book.readingStatus,
          book.series,
          book.description,
          book.published,
          book.pageCount,
          book.subjects,
        ],
      );
      book.setId(Number(result.lastInsertRowId));
      return book;
    });
  }

  async delete(ownerId: string, isbn: string): Promise<void> {
    return this.enqueue(() =>
      this.db.runAsync("DELETE FROM books WHERE owner_id = ? AND isbn = ?", [ownerId, isbn]).then(
        () => undefined,
      ),
    );
  }

  async cachedIsbn(isbn: string): Promise<BookMetadata | null> {
    return this.enqueue(async () => {
      const row = await this.db.getFirstAsync<{
        isbn: string;
        title: string;
        author: string;
        cover_url: string;
        publisher: string;
        series: string | null;
        description: string | null;
        published: string | null;
        page_count: number | null;
        subjects: string | null;
      }>("SELECT * FROM isbn_cache WHERE isbn = ?", [isbn]);
      if (!row) {
        return null;
      }
      return {
        isbn: row.isbn,
        title: row.title,
        author: row.author,
        coverUrl: row.cover_url,
        publisher: row.publisher,
        series: row.series ?? "",
        description: row.description ?? "",
        published: row.published ?? "",
        pageCount: row.page_count ?? 0,
        subjects: row.subjects ?? "",
      };
    });
  }

  async cacheIsbn(metadata: BookMetadata): Promise<void> {
    return this.enqueue(async () => {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO isbn_cache (isbn, title, author, cover_url, publisher, series, description, published, page_count, subjects) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          metadata.isbn,
          metadata.title,
          metadata.author,
          metadata.coverUrl,
          metadata.publisher,
          metadata.series,
          metadata.description,
          metadata.published,
          metadata.pageCount,
          metadata.subjects,
        ],
      );
    });
  }

  private mapRow(row: Record<string, unknown>): BookRow {
    return toRow(
      String(row.owner_id),
      new Book(
        String(row.isbn),
        String(row.title),
        String(row.author),
        String(row.cover_url),
        String(row.publisher),
        migrateLegacyShelf(String(row.shelf)),
        Number(row.copy_count),
        (row.acquired_as as Acquisition | null) || null,
        (row.gifted_by as string | null) || null,
        (row.reading_status as ReadingStatus) ?? ReadingStatus.UNREAD,
        String(row.series || row.collection || ""),
        String(row.description ?? ""),
        String(row.published ?? ""),
        Number(row.page_count ?? 0),
        String(row.subjects ?? ""),
        Number(row.id),
      ),
      Number(row.id),
    );
  }
}
