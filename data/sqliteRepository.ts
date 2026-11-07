/**
 * Data: SqliteBookRepository implements the BookRepository, IsbnCache and SyncStore
 * ports on device. Owns the schema and its upgrades; row ↔ Book conversion is
 * BookRowMapper's job. A delete keeps the row as a tombstone so the deletion syncs.
 * Only CompositionRoot (bootstrap.ts) opens it; nothing else imports expo-sqlite.
 */
import * as SQLite from "expo-sqlite";
import { Acquisition, Book, BookFormat, PersonalLibrary, ReadingStatus, Shelf } from "../domain";
import { BookMetadata, BookRepository, BookVersion, IsbnCache, SyncStore } from "../service/ports";
import { Clock } from "./bookRepository";
import { BookRow, BookRowMapper } from "./bookRowMapper";

// Mutable book columns, shared by UPDATE and INSERT so the list is written once.
const BOOK_COLUMNS = [
  "title",
  "author",
  "cover_url",
  "publisher",
  "shelf",
  "copy_count",
  "acquired_as",
  "gifted_by",
  "reading_status",
  "series",
  "description",
  "published",
  "page_count",
  "subjects",
  "format",
  "updated_at",
  "deleted_at",
] as const;

// Columns added after the first release: [table, column, type + default].
// migrate() adds any that an older database is missing.
const ADDED_COLUMNS: [table: string, column: string, definition: string][] = [
  ["books", "reading_status", "TEXT NOT NULL DEFAULT 'UNREAD'"],
  ["books", "series", "TEXT NOT NULL DEFAULT ''"],
  ["books", "description", "TEXT NOT NULL DEFAULT ''"],
  ["books", "published", "TEXT NOT NULL DEFAULT ''"],
  ["books", "page_count", "INTEGER NOT NULL DEFAULT 0"],
  ["books", "subjects", "TEXT NOT NULL DEFAULT ''"],
  ["isbn_cache", "series", "TEXT NOT NULL DEFAULT ''"],
  ["isbn_cache", "description", "TEXT NOT NULL DEFAULT ''"],
  ["isbn_cache", "published", "TEXT NOT NULL DEFAULT ''"],
  ["isbn_cache", "page_count", "INTEGER NOT NULL DEFAULT 0"],
  ["isbn_cache", "subjects", "TEXT NOT NULL DEFAULT ''"],
  ["books", "format", "TEXT NOT NULL DEFAULT 'UNKNOWN'"],
  ["isbn_cache", "format", "TEXT NOT NULL DEFAULT 'UNKNOWN'"],
  ["isbn_cache", "cover_candidates", "TEXT NOT NULL DEFAULT '[]'"],
  ["books", "updated_at", "INTEGER NOT NULL DEFAULT 0"],
  ["books", "deleted_at", "INTEGER"],
];

// Marker column for the current lookup format (edition-first + Google Books with
// cover-by-ISBN). A database without it holds older lookups: they are dropped once.
const CACHE_VERSION_COLUMN = "parser_v4";

export class SqliteBookRepository implements BookRepository, IsbnCache, SyncStore {
  private queue: Promise<void> = Promise.resolve();

  private constructor(
    private readonly db: SQLite.SQLiteDatabase,
    private readonly clock: Clock,
  ) {}

  // Factory: the constructor is private so a repository is never used before migrate().
  static async open(clock: Clock = Date.now): Promise<SqliteBookRepository> {
    const db = await SQLite.openDatabaseAsync("myhomelib.db", { useNewConnection: true });
    const repo = new SqliteBookRepository(db, clock);
    await repo.migrate();
    return repo;
  }

  // expo-sqlite allows one statement at a time on a connection: every call
  // waits its turn on this queue, and a failure does not block later calls.
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = this.queue.then(work, work);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  // The books table as it is today. An ISBN is unique per owner, not across owners.
  private static booksTable(name: string): string {
    return `
      CREATE TABLE IF NOT EXISTS ${name} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id TEXT NOT NULL,
        isbn TEXT NOT NULL,
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
        subjects TEXT NOT NULL DEFAULT '',
        format TEXT NOT NULL DEFAULT 'UNKNOWN',
        updated_at INTEGER NOT NULL DEFAULT 0,
        deleted_at INTEGER,
        UNIQUE (owner_id, isbn)
      );`;
  }

  private async migrate(): Promise<void> {
    await this.db.execAsync(`
      ${SqliteBookRepository.booksTable("books")}
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
    // Read each table's existing columns once, then add whatever is missing.
    const existing: Record<string, string[]> = {};
    for (const table of ["books", "isbn_cache"]) {
      existing[table] = (
        await this.db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)
      ).map((column) => column.name);
    }
    for (const [table, column, definition] of ADDED_COLUMNS) {
      if (!existing[table].includes(column)) {
        await this.db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
      }
    }
    if (!existing.isbn_cache.includes(CACHE_VERSION_COLUMN)) {
      await this.db.execAsync(
        `ALTER TABLE isbn_cache ADD COLUMN ${CACHE_VERSION_COLUMN} INTEGER NOT NULL DEFAULT 1;`,
      );
      await this.db.execAsync(`DELETE FROM isbn_cache;`);
    }
    await this.db.execAsync(
      `UPDATE books SET shelf = 'OWNED', reading_status = 'UNREAD' WHERE shelf = 'TBR';`,
    );
    // Older builds called the series "collection".
    if (existing.books.includes("collection")) {
      await this.db.execAsync(
        `UPDATE books SET series = collection WHERE series = '' AND collection IS NOT NULL AND collection != '';`,
      );
    }
    await this.rebuildIfIsbnGloballyUnique();
    await this.rekeyIsbn10Rows();
  }

  // Rows saved before books were keyed by ISBN-13 may hold a typed ISBN-10. Each
  // becomes its ISBN-13; if the owner already has that row, the two are one book,
  // so the copies are added together (the duplicate-ISBN rule) and the old row goes.
  private async rekeyIsbn10Rows(): Promise<void> {
    const rows = await this.db.getAllAsync<{ id: number; owner_id: string; isbn: string; copy_count: number }>(
      "SELECT id, owner_id, isbn, copy_count FROM books WHERE length(isbn) = 10",
    );
    for (const row of rows) {
      const key = BookRowMapper.isbnKey(row.isbn);
      if (key === row.isbn) {
        continue;
      }
      const existing = await this.db.getFirstAsync<{ id: number }>(
        "SELECT id FROM books WHERE owner_id = ? AND isbn = ?",
        [row.owner_id, key],
      );
      if (existing) {
        await this.db.runAsync("UPDATE books SET copy_count = copy_count + ? WHERE id = ?", [row.copy_count, existing.id]);
        await this.db.runAsync("DELETE FROM books WHERE id = ?", [row.id]);
      } else {
        await this.db.runAsync("UPDATE books SET isbn = ? WHERE id = ?", [key, row.id]);
      }
    }
  }

  // Builds before the owner fix declared the ISBN unique across all owners, so a
  // second owner could not shelve the same book. SQLite can't drop a constraint:
  // copy the rows into a table with UNIQUE (owner_id, isbn), in one transaction.
  private async rebuildIfIsbnGloballyUnique(): Promise<void> {
    const table = await this.db.getFirstAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'books'",
    );
    if (!table || !/isbn\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i.test(table.sql)) {
      return;
    }
    const columns = ["id", "owner_id", "isbn", ...BOOK_COLUMNS].join(", ");
    try {
      await this.db.execAsync(`
        BEGIN;
        ${SqliteBookRepository.booksTable("books_by_owner")}
        INSERT INTO books_by_owner (${columns}) SELECT ${columns} FROM books;
        DROP TABLE books;
        ALTER TABLE books_by_owner RENAME TO books;
        COMMIT;`);
    } catch (error) {
      await this.db.execAsync("ROLLBACK;").catch(() => undefined);
      throw error;
    }
  }

  async loadLibrary(ownerId: string): Promise<PersonalLibrary> {
    return this.enqueue(async () => {
      const rows = await this.db.getAllAsync<Record<string, unknown>>(
        "SELECT * FROM books WHERE owner_id = ? AND deleted_at IS NULL",
        [ownerId],
      );
      return new PersonalLibrary(rows.map((row) => BookRowMapper.toBook(this.mapRow(row))));
    });
  }

  // Insert, or update this owner's row for the ISBN (reviving a deleted one).
  async save(ownerId: string, book: Book): Promise<Book> {
    return this.enqueue(async () => {
      await this.upsert(BookRowMapper.toRow(ownerId, book, this.clock()));
      return book;
    });
  }

  // Soft delete: the row stays as a tombstone so the deletion syncs.
  async delete(ownerId: string, isbn: string): Promise<void> {
    return this.enqueue(async () => {
      const now = this.clock();
      await this.db.runAsync(
        "UPDATE books SET deleted_at = ?, updated_at = ? WHERE owner_id = ? AND isbn = ? AND deleted_at IS NULL",
        [now, now, ownerId, isbn],
      );
    });
  }

  async versions(ownerId: string): Promise<BookVersion[]> {
    return this.enqueue(async () => {
      const rows = await this.db.getAllAsync<Record<string, unknown>>("SELECT * FROM books WHERE owner_id = ?", [ownerId]);
      return rows.map((row) => BookRowMapper.toVersion(this.mapRow(row)));
    });
  }

  async applyVersions(ownerId: string, versions: BookVersion[]): Promise<void> {
    return this.enqueue(async () => {
      for (const version of versions) {
        await this.upsert(BookRowMapper.fromVersion(ownerId, version));
      }
    });
  }

  // One row in, by (owner, ISBN). Every value is a bound parameter; only the
  // fixed column names are spliced into the SQL.
  private async upsert(row: BookRow): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO books (owner_id, isbn, ${BOOK_COLUMNS.join(", ")})
       VALUES (?, ?, ${BOOK_COLUMNS.map(() => "?").join(", ")})
       ON CONFLICT (owner_id, isbn) DO UPDATE SET ${BOOK_COLUMNS.map((column) => `${column} = excluded.${column}`).join(", ")}`,
      [row.ownerId, row.isbn, ...SqliteBookRepository.values(row)],
    );
  }

  async cachedIsbn(isbn: string): Promise<BookMetadata | null> {
    return this.enqueue(async () => {
      const row = await this.db.getFirstAsync<Record<string, unknown>>(
        "SELECT * FROM isbn_cache WHERE isbn = ?",
        [isbn],
      );
      if (!row) {
        return null;
      }
      return BookRowMapper.metadataWithDefaults({
        isbn: String(row.isbn),
        title: String(row.title),
        author: String(row.author),
        coverUrl: String(row.cover_url),
        coverCandidates: BookRowMapper.coverList(row.cover_candidates),
        publisher: String(row.publisher),
        format: (row.format as BookFormat) || BookFormat.UNKNOWN,
        series: String(row.series ?? ""),
        description: String(row.description ?? ""),
        published: String(row.published ?? ""),
        pageCount: Number(row.page_count ?? 0),
        subjects: String(row.subjects ?? ""),
      });
    });
  }

  async cacheIsbn(metadata: BookMetadata): Promise<void> {
    return this.enqueue(async () => {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO isbn_cache (isbn, title, author, cover_url, cover_candidates, publisher, format, series, description, published, page_count, subjects) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          metadata.isbn,
          metadata.title,
          metadata.author,
          metadata.coverUrl,
          JSON.stringify(metadata.coverCandidates),
          metadata.publisher,
          metadata.format,
          metadata.series,
          metadata.description,
          metadata.published,
          metadata.pageCount,
          metadata.subjects,
        ],
      );
    });
  }

  // Same order as BOOK_COLUMNS. No acquisition (or no deletion) is stored as NULL.
  private static values(row: BookRow): (string | number | null)[] {
    return [
      row.title,
      row.author,
      row.coverUrl,
      row.publisher,
      row.shelf,
      row.copyCount,
      row.acquiredAs,
      row.giftedBy,
      row.readingStatus,
      row.series,
      row.description,
      row.published,
      row.pageCount,
      row.subjects,
      row.format,
      row.updatedAt,
      row.deletedAt,
    ];
  }

  // snake_case columns → BookRow. BookRowMapper fills whatever an older schema lacks.
  private mapRow(row: Record<string, unknown>): BookRow {
    return BookRowMapper.withDefaults({
      ownerId: String(row.owner_id),
      isbn: String(row.isbn),
      title: String(row.title),
      author: String(row.author),
      coverUrl: String(row.cover_url),
      publisher: String(row.publisher),
      shelf: row.shelf as Shelf,
      copyCount: Number(row.copy_count),
      acquiredAs: row.acquired_as as Acquisition | null,
      giftedBy: row.gifted_by as string | null,
      readingStatus: row.reading_status as ReadingStatus | undefined,
      series: row.series as string | undefined,
      collection: row.collection as string | undefined,
      description: row.description as string | undefined,
      published: row.published as string | undefined,
      pageCount: row.page_count as number | undefined,
      subjects: row.subjects as string | undefined,
      format: row.format as BookFormat | undefined,
      updatedAt: row.updated_at as number | undefined,
      deletedAt: row.deleted_at as number | null | undefined,
    });
  }
}
