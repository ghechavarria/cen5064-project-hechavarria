/**
 * Tests: Domain rules (copies, Wanted→Owned, gift source) without React/SQLite/HTTP.
 */
import { Acquisition, Book, PersonalLibrary, ReadingStatus, Shelf } from "../domain";
import {
  BookNotFoundError,
  GiftSourceRequiredError,
  NotAcquiredError,
} from "../domain/exceptions";

function fox(shelf: Shelf = Shelf.OWNED): Book {
  return new Book(
    "9780140328721",
    "Fantastic Mr. Fox",
    "Roald Dahl",
    "https://covers.openlibrary.org/b/isbn/9780140328721-M.jpg",
    "Puffin",
    shelf,
  );
}

test("owned or wanted is independent of read or unread", () => {
  const book = fox(Shelf.WANTED);
  expect(book.shelf).toBe(Shelf.WANTED);
  expect(book.readingStatus).toBe(ReadingStatus.UNREAD);
  book.setReadingStatus(ReadingStatus.READ);
  expect(book.shelf).toBe(Shelf.WANTED);
  expect(book.readingStatus).toBe(ReadingStatus.READ);
});

test("duplicate isbn increments copy count instead of a second row", () => {
  const library = new PersonalLibrary("local");
  library.addBook(fox());
  library.get("9780140328721").addCopy();
  expect(library.books).toHaveLength(1);
  expect(library.get("9780140328721").copyCount).toBe(2);
});

test("wanted cannot move to owned without purchase or gift", () => {
  const book = fox(Shelf.WANTED);
  expect(() => book.moveTo(Shelf.OWNED)).toThrow(NotAcquiredError);
  book.markPurchased();
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
  expect(() => book.markGifted("  ")).toThrow(GiftSourceRequiredError);
  book.markGifted("Maya");
  book.moveTo(Shelf.OWNED);
  expect(book.giftedBy).toBe("Maya");
  expect(book.acquiredAs).toBe(Acquisition.GIFTED);
});

test("series does not change shelf or reading status", () => {
  const book = fox();
  book.fillFacts({
    series: "  Fantastic Mr Fox  ",
    description: "A fox.",
    published: "1970",
    pageCount: 96,
    subjects: "Animals",
  });
  expect(book.series).toBe("Fantastic Mr Fox");
  expect(book.description).toBe("A fox.");
  expect(book.shelf).toBe(Shelf.OWNED);
  expect(book.readingStatus).toBe(ReadingStatus.UNREAD);
});

test("remove drops the book from the library", () => {
  const library = new PersonalLibrary("local");
  library.addBook(fox());
  library.remove("9780140328721");
  expect(library.books).toHaveLength(0);
  expect(() => library.get("9780140328721")).toThrow(BookNotFoundError);
});

test("booksOn filters by shelf and reading status", () => {
  const library = new PersonalLibrary("local");
  const unread = fox(Shelf.OWNED);
  const read = new Book(
    "9780142410332",
    "Matilda",
    "Roald Dahl",
    "",
    "Puffin",
    Shelf.OWNED,
    1,
    null,
    null,
    ReadingStatus.READ,
  );
  library.addBook(unread);
  library.addBook(read);
  expect(library.booksOn(Shelf.OWNED, ReadingStatus.UNREAD)).toHaveLength(1);
  expect(library.booksOn(Shelf.OWNED, ReadingStatus.READ)[0].isbn).toBe("9780142410332");
});
