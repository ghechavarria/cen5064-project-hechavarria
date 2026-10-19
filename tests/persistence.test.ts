/// <reference types="node" />
/**
 * Tests: persistence — BookRowMapper (flatten, rebuild, legacy and damaged
 * rows), JSON storage (corrupted save, old cache), the BookRepository contract
 * every adapter must pass (including owner isolation, the base for Google
 * Account sync), and SqliteBookRepository against a real SQLite database
 * (Node's built-in node:sqlite behind the expo-sqlite calls it makes).
 */
import { JsonBookRepository, MemoryBookRepository } from "../data/bookRepository";
import { BookRow, BookRowMapper, StoredRow } from "../data/bookRowMapper";
import { Acquisition, Book, BookFormat, Gift, Purchase, ReadingStatus, Shelf } from "../domain";
import { BookRepository } from "../service/ports";
import { FOX } from "./fixtures";

const FULL_BOOK = () =>
  new Book({
    ...FOX,
    shelf: Shelf.OWNED,
    copyCount: 2,
    acquisition: new Gift("Grandma"),
    readingStatus: ReadingStatus.READ,
  });

// Every field a Book exposes, for comparing a rebuilt book with the original.
const fields = (book: Book) => BookRowMapper.toRow("any", book);

// --- BookRowMapper ---

describe("BookRowMapper", () => {
  test("flattens a gifted book into two acquisition columns and rebuilds it without loss", () => {
    const book = FULL_BOOK();
    const row = BookRowMapper.toRow("owner-1", book);
    expect(row).toMatchObject({ ownerId: "owner-1", acquiredAs: Acquisition.GIFTED, giftedBy: "Grandma" });
    expect(JSON.parse(JSON.stringify(row))).toEqual(row); // plain, serializable data
    const rebuilt = BookRowMapper.toBook(row);
    expect(rebuilt.acquisition).toBeInstanceOf(Gift);
    expect(fields(rebuilt)).toEqual(fields(book));
  });

  test("a purchase rebuilds as a Purchase with no giver; no acquisition stays null", () => {
    const bought = new Book({ ...FOX, shelf: Shelf.OWNED, acquisition: new Purchase() });
    const boughtRow = BookRowMapper.toRow("o", bought);
    expect(boughtRow).toMatchObject({ acquiredAs: Acquisition.PURCHASED, giftedBy: null });
    expect(BookRowMapper.toBook(boughtRow).acquisition).toBeInstanceOf(Purchase);

    const wanted = BookRowMapper.toRow("o", new Book({ ...FOX, shelf: Shelf.WANTED }));
    expect(wanted).toMatchObject({ acquiredAs: null, giftedBy: null });
    expect(BookRowMapper.toBook(wanted).acquisition).toBeNull();
  });

  test("a legacy row: collection becomes series, TBR becomes Owned + unread, missing facts get defaults", () => {
    const legacy: StoredRow = {
      ownerId: "local",
      isbn: FOX.isbn,
      title: "Fantastic Mr. Fox",
      author: "Roald Dahl",
      coverUrl: "",
      publisher: "Puffin",
      shelf: "TBR" as Shelf,
      copyCount: 1,
      collection: "Fox Tales",
    };
    expect(BookRowMapper.withDefaults(legacy)).toEqual<BookRow>({
      ownerId: "local",
      isbn: FOX.isbn,
      title: "Fantastic Mr. Fox",
      author: "Roald Dahl",
      coverUrl: "",
      publisher: "Puffin",
      shelf: Shelf.OWNED,
      copyCount: 1,
      acquiredAs: null,
      giftedBy: null,
      readingStatus: ReadingStatus.UNREAD,
      series: "Fox Tales",
      description: "",
      published: "",
      pageCount: 0,
      subjects: "",
      format: BookFormat.UNKNOWN,
    });
  });

  test("a series already stored wins over the legacy collection", () => {
    const row = BookRowMapper.withDefaults({ ownerId: "o", isbn: "1", series: "New", collection: "Old" });
    expect(row.series).toBe("New");
  });

  test("damaged values fall back to safe defaults instead of reaching the domain", () => {
    const row = BookRowMapper.withDefaults({
      ownerId: " o ",
      isbn: FOX.isbn,
      title: "   ",
      author: 42 as unknown as string,
      shelf: "ATTIC" as Shelf,
      copyCount: -3,
      acquiredAs: "STOLEN" as Acquisition,
      giftedBy: "Someone",
      readingStatus: "SKIMMED" as ReadingStatus,
      pageCount: Number.NaN,
      format: "SCROLL" as BookFormat,
    });
    expect(row).toMatchObject({
      ownerId: "o",
      title: "Untitled",
      author: "Unknown",
      shelf: Shelf.WANTED, // never Owned without a valid acquisition
      copyCount: 1,
      acquiredAs: null,
      giftedBy: null, // a giver only means something on a gift
      readingStatus: ReadingStatus.UNREAD,
      pageCount: 0,
      format: BookFormat.UNKNOWN,
    });
  });

  test("only rows that name an owner and an ISBN are usable", () => {
    expect(BookRowMapper.isUsable({ ownerId: "o", isbn: FOX.isbn })).toBe(true);
    for (const bad of [null, "row", 7, {}, { isbn: FOX.isbn }, { ownerId: "o" }, { ownerId: "", isbn: "1" }, { ownerId: "o", isbn: "  " }]) {
      expect(BookRowMapper.isUsable(bad)).toBe(false);
    }
  });

  test("stored cover lists: unreadable JSON or non-strings read as no covers", () => {
    expect(BookRowMapper.coverList('["a.jpg","b.jpg"]')).toEqual(["a.jpg", "b.jpg"]);
    expect(BookRowMapper.coverList('["a.jpg", 5, null]')).toEqual(["a.jpg"]);
    expect(BookRowMapper.coverList("{not json")).toEqual([]);
    expect(BookRowMapper.coverList('{"a":1}')).toEqual([]);
    expect(BookRowMapper.coverList(null)).toEqual([]);
  });
});

// --- JSON (browser storage) ---

/** A localStorage stand-in. */
class FakeStorage {
  readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

const KEY = "myhomelib.library.v1";

describe("JsonBookRepository", () => {
  test("a corrupted save is backed up, and the app starts with an empty library instead of crashing", async () => {
    const storage = new FakeStorage();
    storage.setItem(KEY, '{"books": [ {"ownerId": "local", "isb');
    const library = await new JsonBookRepository(storage).loadLibrary("local");
    expect(library.books).toHaveLength(0);
    expect(storage.getItem(`${KEY}.unreadable`)).toBe('{"books": [ {"ownerId": "local", "isb');
    expect(JSON.parse(storage.getItem(KEY) ?? "")).toMatchObject({ books: [] });
  });

  test("JSON that isn't a library object is treated as corrupted too", async () => {
    for (const raw of ["null", "[1,2]", '"text"']) {
      const storage = new FakeStorage();
      storage.setItem(KEY, raw);
      expect((await new JsonBookRepository(storage).loadLibrary("local")).books).toHaveLength(0);
    }
  });

  test("damaged rows are skipped and the rest of the library still loads", async () => {
    const storage = new FakeStorage();
    const good = BookRowMapper.toRow("local", FULL_BOOK());
    storage.setItem(KEY, JSON.stringify({ books: [null, { title: "no owner or isbn" }, good, "x"], isbnCache: {}, cacheParser: 4 }));
    const library = await new JsonBookRepository(storage).loadLibrary("local");
    expect(library.books.map((book) => book.isbn)).toEqual([FOX.isbn]);
  });

  test("lookups cached by an older lookup format are dropped; the books are kept", async () => {
    const storage = new FakeStorage();
    storage.setItem(
      KEY,
      JSON.stringify({ books: [BookRowMapper.toRow("local", FULL_BOOK())], isbnCache: { [FOX.isbn]: FOX }, cacheParser: 3 }),
    );
    const repository = new JsonBookRepository(storage);
    expect(await repository.cachedIsbn(FOX.isbn)).toBeNull();
    expect((await repository.loadLibrary("local")).books).toHaveLength(1);
  });
});

// --- SQLite harness: a real database via node:sqlite ---

type NodeDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): unknown;
  };
};

// node:sqlite ships with Node 22.13+; without it the SQLite tests are skipped, not failed.
const nodeSqlite = (() => {
  try {
    return require("node:sqlite") as { DatabaseSync: new (path: string) => NodeDatabase };
  } catch {
    return null;
  }
})();

/** The four expo-sqlite calls SqliteBookRepository makes, answered by node:sqlite. */
class NodeSqliteDatabase {
  constructor(readonly db: NodeDatabase) {}
  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }
  async getAllAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }
  async getFirstAsync<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    return (this.db.prepare(sql).get(...params) as T | undefined) ?? null;
  }
  async runAsync(sql: string, params: unknown[] = []): Promise<void> {
    this.db.prepare(sql).run(...params);
  }
}

let mockDatabase: NodeSqliteDatabase;
jest.mock("expo-sqlite", () => ({ openDatabaseAsync: async () => mockDatabase }), { virtual: true });

const freshDatabase = () => {
  mockDatabase = new NodeSqliteDatabase(new nodeSqlite!.DatabaseSync(":memory:"));
  return mockDatabase;
};
const openSqlite = async () => (await import("../data/sqliteRepository")).SqliteBookRepository.open();

// --- BookRepository contract ---
// Every storage adapter must pass these. They are also the contract for the
// planned Google Account sync (core feature 4): its adapter implements the same
// BookRepository port, so it joins this list and must keep each account's books apart.

const adapters: [name: string, open: () => Promise<BookRepository>][] = [
  ["memory", async () => new MemoryBookRepository()],
  ["JSON (browser storage)", async () => new JsonBookRepository(new FakeStorage())],
  ...(nodeSqlite
    ? [["SQLite", async () => (freshDatabase(), openSqlite())] as [string, () => Promise<BookRepository>]]
    : []),
];

describe.each(adapters)("BookRepository contract: %s", (_name, open) => {
  test("saves and reloads every field of a book", async () => {
    const repository = await open();
    await repository.save("local", FULL_BOOK());
    const [book] = (await repository.loadLibrary("local")).books;
    expect(fields(book)).toEqual(fields(FULL_BOOK()));
    expect(book.acquisition).toBeInstanceOf(Gift);
  });

  test("saving the same ISBN again updates that book instead of adding a second", async () => {
    const repository = await open();
    const book = FULL_BOOK();
    await repository.save("local", book);
    book.addCopy();
    await repository.save("local", book);
    const books = (await repository.loadLibrary("local")).books;
    expect(books).toHaveLength(1);
    expect(books[0].copyCount).toBe(3);
  });

  test("keeps each owner's books apart, even for the same ISBN", async () => {
    const repository = await open();
    await repository.save("alice", new Book({ ...FOX, shelf: Shelf.OWNED, acquisition: new Purchase() }));
    await repository.save("bob", new Book({ ...FOX, shelf: Shelf.WANTED }));
    expect((await repository.loadLibrary("alice")).books.map((book) => book.shelf)).toEqual([Shelf.OWNED]);
    expect((await repository.loadLibrary("bob")).books.map((book) => book.shelf)).toEqual([Shelf.WANTED]);

    await repository.delete("bob", FOX.isbn);
    expect((await repository.loadLibrary("bob")).books).toHaveLength(0);
    expect((await repository.loadLibrary("alice")).books).toHaveLength(1);
    expect((await repository.loadLibrary("")).books).toHaveLength(0); // no owner, no books
  });

  test("caches looked-up metadata by ISBN", async () => {
    const repository = await open();
    expect(await repository.cachedIsbn(FOX.isbn)).toBeNull();
    await repository.cacheIsbn(FOX);
    expect(await repository.cachedIsbn(FOX.isbn)).toEqual(FOX);
  });
});

// --- One key per book: ISBN-10 rows saved by older builds ---

const FOX_ISBN10 = "0140328726"; // the same book as FOX.isbn (9780140328721)

test("JSON: an ISBN-10 row loads under its ISBN-13, and a row stored both ways becomes one book", async () => {
  const storage = new FakeStorage();
  const as10 = { ...BookRowMapper.toRow("local", FULL_BOOK()), isbn: FOX_ISBN10, copyCount: 1 };
  const as13 = { ...BookRowMapper.toRow("local", FULL_BOOK()), copyCount: 2 };
  storage.setItem(KEY, JSON.stringify({ books: [as10, as13], isbnCache: {}, cacheParser: 4 }));
  const books = (await new JsonBookRepository(storage).loadLibrary("local")).books;
  expect(books.map((book) => [book.isbn, book.copyCount])).toEqual([[FOX.isbn, 3]]);
});

// --- SQLite specifics: schema, NULLs, bound parameters, upgrades ---

const sqliteDescribe = nodeSqlite ? describe : describe.skip;

sqliteDescribe("SqliteBookRepository", () => {
  test("a book with no acquisition is stored with NULL columns, as the schema intends", async () => {
    const database = freshDatabase();
    const repository = await openSqlite();
    await repository.save("local", new Book({ ...FOX, shelf: Shelf.WANTED }));
    const row = await database.getFirstAsync<{ acquired_as: unknown; gifted_by: unknown }>(
      "SELECT acquired_as, gifted_by FROM books WHERE isbn = ?",
      [FOX.isbn],
    );
    expect(row).toEqual({ acquired_as: null, gifted_by: null });
  });

  test("values are bound as parameters: quotes and SQL in a title are stored literally", async () => {
    const database = freshDatabase();
    const repository = await openSqlite();
    const title = "Robert'); DROP TABLE books; --";
    await repository.save("o'; DELETE FROM books; --", new Book({ ...FOX, title, shelf: Shelf.WANTED }));
    const [book] = (await repository.loadLibrary("o'; DELETE FROM books; --")).books;
    expect(book.title).toBe(title);
    expect(await database.getAllAsync("SELECT isbn FROM books")).toHaveLength(1);
  });

  test("an unreadable cached cover list reads as no covers", async () => {
    const database = freshDatabase();
    const repository = await openSqlite();
    await repository.cacheIsbn(FOX);
    await database.runAsync("UPDATE isbn_cache SET cover_candidates = ? WHERE isbn = ?", ["{oops", FOX.isbn]);
    expect((await repository.cachedIsbn(FOX.isbn))?.coverCandidates).toEqual([]);
  });

  test("upgrades a first-release database: TBR, collection → series, and ISBN unique per owner", async () => {
    const database = freshDatabase();
    // The schema and a row exactly as the first release stored them.
    await database.execAsync(`
      CREATE TABLE books (
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
        collection TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE isbn_cache (isbn TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL,
        cover_url TEXT NOT NULL, publisher TEXT NOT NULL);
      INSERT INTO books (owner_id, isbn, title, author, cover_url, publisher, shelf, copy_count, acquired_as, gifted_by, collection)
        VALUES ('local', '${FOX.isbn}', 'Fantastic Mr. Fox', 'Roald Dahl', '', 'Puffin', 'TBR', 2, 'GIFTED', 'Grandma', 'Fox Tales');
      INSERT INTO isbn_cache VALUES ('${FOX.isbn}', 'Old lookup', 'Someone', '', '');
    `);
    const repository = await openSqlite();

    const [book] = (await repository.loadLibrary("local")).books;
    expect(book).toMatchObject({
      shelf: Shelf.OWNED,
      readingStatus: ReadingStatus.UNREAD,
      series: "Fox Tales",
      copyCount: 2,
      giftedBy: "Grandma",
      format: BookFormat.UNKNOWN,
    });
    expect(await repository.cachedIsbn(FOX.isbn)).toBeNull(); // old-format lookups dropped

    // The rebuilt table lets a second owner shelve the same ISBN.
    await repository.save("guest", new Book({ ...FOX, shelf: Shelf.WANTED }));
    expect((await repository.loadLibrary("guest")).books).toHaveLength(1);
    expect((await repository.loadLibrary("local")).books[0].copyCount).toBe(2);

    // Opening again is a no-op: nothing is rebuilt or lost twice.
    await openSqlite();
    expect(await database.getAllAsync("SELECT isbn FROM books")).toHaveLength(2);
  });

  test("re-keys ISBN-10 rows as ISBN-13, merging a book stored both ways into one", async () => {
    const database = freshDatabase();
    const repository = await openSqlite();
    await repository.save("local", new Book({ ...FOX, shelf: Shelf.WANTED, copyCount: 2 }));
    // Rows an older build saved under typed ISBN-10s: one duplicates the book above.
    await database.runAsync("UPDATE books SET isbn = ? WHERE isbn = ?", [FOX_ISBN10, FOX.isbn]);
    await repository.save("local", new Book({ ...FOX, shelf: Shelf.WANTED }));
    await repository.save("other", new Book({ ...FOX, shelf: Shelf.WANTED }));
    await database.runAsync("UPDATE books SET isbn = ? WHERE owner_id = ?", [FOX_ISBN10, "other"]);

    const reopened = await openSqlite();
    expect((await reopened.loadLibrary("local")).books.map((book) => [book.isbn, book.copyCount])).toEqual([[FOX.isbn, 3]]);
    expect((await reopened.loadLibrary("other")).books.map((book) => book.isbn)).toEqual([FOX.isbn]);
    expect(await database.getAllAsync("SELECT isbn FROM books WHERE length(isbn) = 10")).toHaveLength(0);
  });
});
