/**
 * Tests: Domain rules (copies, Wanted→Owned, gift source) without React/SQLite/HTTP.
 */
import {
  Acquisition,
  AcquisitionRecord,
  Book,
  BookFormat,
  Gift,
  PersonalLibrary,
  Purchase,
  ReadingStatus,
  Shelf,
} from "../domain";
import {
  BookNotFoundError,
  GiftSourceRequiredError,
  NotAcquiredError,
} from "../domain/exceptions";

function fox(shelf: Shelf = Shelf.OWNED): Book {
  return new Book({
    isbn: "9780140328721",
    title: "Fantastic Mr. Fox",
    author: "Roald Dahl",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9780140328721-M.jpg",
    publisher: "Puffin",
    shelf,
    acquisition: shelf === Shelf.OWNED ? new Purchase() : null,
  });
}

test("owned or wanted is independent of read or unread", () => {
  const book = fox(Shelf.WANTED);
  expect(book.shelf).toBe(Shelf.WANTED);
  expect(book.readingStatus).toBe(ReadingStatus.UNREAD);
  book.setReadingStatus(ReadingStatus.READ);
  expect(book.shelf).toBe(Shelf.WANTED);
  expect(book.readingStatus).toBe(ReadingStatus.READ);
});

test("book defaults: one copy, unread, no acquisition, empty facts", () => {
  const book = new Book({
    isbn: "1",
    title: "T",
    author: "A",
    coverUrl: "",
    publisher: "",
    shelf: Shelf.WANTED,
  });
  expect(book.copyCount).toBe(1);
  expect(book.readingStatus).toBe(ReadingStatus.UNREAD);
  expect(book.acquisition).toBeNull();
  expect(book.series).toBe("");
});

test("duplicate isbn increments copy count instead of a second row", () => {
  const library = new PersonalLibrary();
  library.addBook(fox());
  library.get("9780140328721").addCopy();
  expect(library.books).toHaveLength(1);
  expect(library.get("9780140328721").copyCount).toBe(2);
});

test("wanted cannot move to owned without purchase or gift", () => {
  const book = fox(Shelf.WANTED);
  expect(() => book.moveTo(Shelf.OWNED)).toThrow(NotAcquiredError);
  book.acquire(new Purchase());
  book.moveTo(Shelf.OWNED);
  expect(book.shelf).toBe(Shelf.OWNED);
});

test("marking a wanted book read does not require acquisition", () => {
  const book = fox(Shelf.WANTED);
  book.setReadingStatus(ReadingStatus.READ);
  expect(book.shelf).toBe(Shelf.WANTED);
  expect(book.readingStatus).toBe(ReadingStatus.READ);
});

test("gifted move requires a gifter name", () => {
  const book = fox(Shelf.WANTED);
  expect(() => book.acquire(new Gift("  "))).toThrow(GiftSourceRequiredError);
  book.acquire(new Gift("Maya"));
  book.moveTo(Shelf.OWNED);
  expect(book.giftedBy).toBe("Maya");
  expect(book.acquiredAs).toBe(Acquisition.GIFTED);
});

test("empty gift name is rejected", () => {
  const book = fox(Shelf.WANTED);
  expect(() => book.acquire(new Gift(""))).toThrow(GiftSourceRequiredError);
  expect(book.acquisition).toBeNull();
});

test("purchased move records acquisition and keeps reading status", () => {
  const book = fox(Shelf.WANTED);
  book.acquire(new Purchase());
  book.moveTo(Shelf.OWNED);
  expect(book.shelf).toBe(Shelf.OWNED);
  expect(book.acquiredAs).toBe(Acquisition.PURCHASED);
  expect(book.giftedBy).toBeNull();
  expect(book.readingStatus).toBe(ReadingStatus.UNREAD);
});

test("owned book can move to wanted without acquisition", () => {
  const book = fox(Shelf.OWNED);
  book.moveTo(Shelf.WANTED);
  expect(book.shelf).toBe(Shelf.WANTED);
});

test("series does not change shelf or reading status", () => {
  const book = fox();
  book.fillFacts({
    series: "  Fantastic Mr Fox  ",
    description: "A fox.",
    published: "1970",
    pageCount: 96,
    subjects: "Animals",
    format: BookFormat.PAPERBACK,
  });
  expect(book.series).toBe("Fantastic Mr Fox");
  expect(book.description).toBe("A fox.");
  expect(book.shelf).toBe(Shelf.OWNED);
  expect(book.readingStatus).toBe(ReadingStatus.UNREAD);
});

test("fillFacts keeps facts that are already known", () => {
  const book = fox();
  book.fillFacts({ series: "Kept", description: "", published: "", pageCount: 0, subjects: "", format: BookFormat.UNKNOWN });
  book.fillFacts({ series: "Ignored", description: "D", published: "", pageCount: 9, subjects: "", format: BookFormat.HARDCOVER });
  expect(book.series).toBe("Kept");
  expect(book.description).toBe("D");
  expect(book.pageCount).toBe(9);
});

test("owned book cannot be added without purchase or gift", () => {
  const library = new PersonalLibrary();
  const unacquired = new Book({
    isbn: "9780140328721",
    title: "Fantastic Mr. Fox",
    author: "Roald Dahl",
    coverUrl: "",
    publisher: "Puffin",
    shelf: Shelf.OWNED,
  });
  expect(() => library.addBook(unacquired)).toThrow(NotAcquiredError);
  library.addBook(fox(Shelf.WANTED));
  expect(library.books).toHaveLength(1);
});

test("has reports whether an isbn is cataloged", () => {
  const library = new PersonalLibrary();
  expect(library.has("9780140328721")).toBe(false);
  library.addBook(fox());
  expect(library.has("9780140328721")).toBe(true);
});

test("remove drops the book from the library", () => {
  const library = new PersonalLibrary();
  library.addBook(fox());
  library.remove("9780140328721");
  expect(library.books).toHaveLength(0);
  expect(() => library.get("9780140328721")).toThrow(BookNotFoundError);
  expect(() => library.remove("9780140328721")).toThrow(BookNotFoundError);
});

test("booksOn filters by shelf and reading status", () => {
  const library = new PersonalLibrary();
  const unread = fox(Shelf.OWNED);
  const read = new Book({
    isbn: "9780142410332",
    title: "Matilda",
    author: "Roald Dahl",
    coverUrl: "",
    publisher: "Puffin",
    shelf: Shelf.OWNED,
    acquisition: new Gift("Grandma"),
    readingStatus: ReadingStatus.READ,
  });
  library.addBook(unread);
  library.addBook(read);
  expect(library.booksOn(Shelf.OWNED, ReadingStatus.UNREAD)).toHaveLength(1);
  expect(library.booksOn(Shelf.OWNED, ReadingStatus.READ)[0].isbn).toBe("9780142410332");
});

// Polymorphism: each AcquisitionRecord subclass answers for itself.
test("purchase and gift behave polymorphically", () => {
  const records: AcquisitionRecord[] = [new Purchase(), new Gift("Sam"), new Gift(" ")];
  expect(records.map((record) => record.isComplete())).toEqual([true, true, false]);
  expect(records.map((record) => record.describe())).toEqual([
    "Purchased",
    "Gifted by Sam",
    "Gifted by ",
  ]);
  expect(records.map((record) => record.giftedBy)).toEqual([null, "Sam", null]);
});

test("acquisition records restore from stored columns", () => {
  expect(AcquisitionRecord.restore(null, null)).toBeNull();
  expect(AcquisitionRecord.restore(Acquisition.PURCHASED, null)).toBeInstanceOf(Purchase);
  const gift = AcquisitionRecord.restore(Acquisition.GIFTED, "Maya");
  expect(gift).toBeInstanceOf(Gift);
  expect(gift?.giftedBy).toBe("Maya");
});
