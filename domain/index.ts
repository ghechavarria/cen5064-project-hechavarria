/**
 * Domain: Book, PersonalLibrary, Shelf, ReadingStatus, Acquisition.
 * Must not import React, SQLite, or HTTP.
 */
import {
  BookNotFoundError,
  DuplicateIsbnError,
  GiftSourceRequiredError,
  NotAcquiredError,
} from "./exceptions";

export enum Shelf {
  OWNED = "OWNED",
  WANTED = "WANTED",
}

export enum ReadingStatus {
  UNREAD = "UNREAD",
  READ = "READ",
}

export enum Acquisition {
  PURCHASED = "PURCHASED",
  GIFTED = "GIFTED",
}

export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export class Book {
  constructor(
    private readonly _isbn: string,
    private _title: string,
    private _author: string,
    private _coverUrl: string,
    private _publisher: string,
    private _shelf: Shelf,
    private _copyCount: number = 1,
    private _acquiredAs: Acquisition | null = null,
    private _giftedBy: string | null = null,
    private _readingStatus: ReadingStatus = ReadingStatus.UNREAD,
    private _series: string = "",
    private _description: string = "",
    private _published: string = "",
    private _pageCount: number = 0,
    private _subjects: string = "",
    private _id: number | null = null,
  ) {}

  get isbn(): string {
    return this._isbn;
  }
  get title(): string {
    return this._title;
  }
  get author(): string {
    return this._author;
  }
  get coverUrl(): string {
    return this._coverUrl;
  }
  get publisher(): string {
    return this._publisher;
  }
  get shelf(): Shelf {
    return this._shelf;
  }
  get copyCount(): number {
    return this._copyCount;
  }
  get acquiredAs(): Acquisition | null {
    return this._acquiredAs;
  }
  get giftedBy(): string | null {
    return this._giftedBy;
  }
  get readingStatus(): ReadingStatus {
    return this._readingStatus;
  }
  get series(): string {
    return this._series;
  }
  get description(): string {
    return this._description;
  }
  get published(): string {
    return this._published;
  }
  get pageCount(): number {
    return this._pageCount;
  }
  get subjects(): string {
    return this._subjects;
  }
  get id(): number | null {
    return this._id;
  }

  setId(id: number): void {
    this._id = id;
  }

  // Duplicate ISBN: increment copies, do not insert a second row.
  addCopy(): void {
    this._copyCount += 1;
  }

  markPurchased(): void {
    this._acquiredAs = Acquisition.PURCHASED;
    this._giftedBy = null;
  }

  markGifted(fromPerson: string): void {
    if (!fromPerson.trim()) {
      throw new GiftSourceRequiredError(this._isbn);
    }
    this._acquiredAs = Acquisition.GIFTED;
    this._giftedBy = fromPerson.trim();
  }

  setReadingStatus(status: ReadingStatus): void {
    this._readingStatus = status;
  }

  fillFacts(facts: {
    series: string;
    description: string;
    published: string;
    pageCount: number;
    subjects: string;
  }): void {
    if (!this._series.trim()) {
      this._series = facts.series.trim();
    }
    if (!this._description.trim()) {
      this._description = facts.description.trim();
    }
    if (!this._published.trim()) {
      this._published = facts.published.trim();
    }
    if (!this._pageCount) {
      this._pageCount = facts.pageCount;
    }
    if (!this._subjects.trim()) {
      this._subjects = facts.subjects.trim();
    }
  }

  // Wanted → Owned requires purchased or gifted (gifted needs the giver’s name).
  moveTo(shelf: Shelf): void {
    if (this._shelf === Shelf.WANTED && shelf === Shelf.OWNED) {
      if (this._acquiredAs === null) {
        throw new NotAcquiredError(this._isbn);
      }
      if (this._acquiredAs === Acquisition.GIFTED && !this._giftedBy) {
        throw new GiftSourceRequiredError(this._isbn);
      }
    }
    this._shelf = shelf;
  }
}

export class PersonalLibrary {
  constructor(
    private readonly _ownerId: string,
    private readonly _books: Book[] = [],
  ) {}

  get ownerId(): string {
    return this._ownerId;
  }

  get books(): Book[] {
    return this._books;
  }

  // New ISBN only; a duplicate must go through addCopy.
  addBook(book: Book): void {
    if (this._books.some((cataloged) => cataloged.isbn === book.isbn)) {
      throw new DuplicateIsbnError(book.isbn);
    }
    this._books.push(book);
  }

  remove(isbn: string): void {
    if (!this._books.some((book) => book.isbn === isbn)) {
      throw new BookNotFoundError(isbn);
    }
    this._books.splice(
      this._books.findIndex((book) => book.isbn === isbn),
      1,
    );
  }

  booksOn(shelf: Shelf, readingStatus?: ReadingStatus): Book[] {
    return this._books.filter(
      (book) =>
        book.shelf === shelf &&
        (readingStatus === undefined || book.readingStatus === readingStatus),
    );
  }

  get(isbn: string): Book {
    const match = this._books.find((book) => book.isbn === isbn);
    if (!match) {
      throw new BookNotFoundError(isbn);
    }
    return match;
  }
}
