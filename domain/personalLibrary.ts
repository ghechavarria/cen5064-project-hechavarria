/**
 * Domain: PersonalLibrary — a collection of Books (composition: the library
 * owns its books). Guards the duplicate-ISBN and Owned rules.
 */
import { Book } from "./book";
import { ReadingStatus, Shelf } from "./enums";
import { BookNotFoundError, DuplicateIsbnError } from "./exceptions";

export class PersonalLibrary {
  constructor(private readonly _books: Book[] = []) {}

  // A copy: adding or removing books goes through addBook / remove and their rules.
  get books(): readonly Book[] {
    return [...this._books];
  }

  has(isbn: string): boolean {
    return this.indexOf(isbn) >= 0;
  }

  // New ISBN only (a duplicate goes through Book.addCopy).
  // An Owned book must already be purchased or gifted.
  addBook(book: Book): void {
    if (this.has(book.isbn)) {
      throw new DuplicateIsbnError(book.isbn);
    }
    if (book.shelf === Shelf.OWNED) {
      book.assertAcquired();
    }
    this._books.push(book);
  }

  remove(isbn: string): void {
    this._books.splice(this.requireIndex(isbn), 1);
  }

  get(isbn: string): Book {
    return this._books[this.requireIndex(isbn)];
  }

  // Books on one shelf, optionally only one reading status (TBR = Owned + unread).
  booksOn(shelf: Shelf, readingStatus?: ReadingStatus): Book[] {
    return this._books.filter(
      (book) =>
        book.shelf === shelf &&
        (readingStatus === undefined || book.readingStatus === readingStatus),
    );
  }

  private indexOf(isbn: string): number {
    return this._books.findIndex((book) => book.isbn === isbn);
  }

  private requireIndex(isbn: string): number {
    const index = this.indexOf(isbn);
    if (index < 0) {
      throw new BookNotFoundError(isbn);
    }
    return index;
  }
}
