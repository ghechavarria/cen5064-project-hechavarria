/**
 * Domain: Book — one cataloged title. State is private; it only changes
 * through methods that enforce the rules (copies, acquisition, shelf moves).
 */
import { AcquisitionRecord } from "./acquisition";
import { Acquisition, BookFormat, ReadingStatus, Shelf } from "./enums";
import { GiftSourceRequiredError, NotAcquiredError } from "./exceptions";

/** Edition facts from the book sources that can be backfilled onto a Book. */
export type BookFacts = {
  series: string;
  description: string;
  published: string;
  pageCount: number;
  subjects: string;
  format: BookFormat;
};

/** Named constructor fields; everything after `shelf` (and every fact) has a default. */
export type BookProps = Partial<BookFacts> & {
  isbn: string;
  title: string;
  author: string;
  coverUrl: string;
  publisher: string;
  shelf: Shelf;
  copyCount?: number;
  acquisition?: AcquisitionRecord | null;
  readingStatus?: ReadingStatus;
};

export class Book {
  private readonly _isbn: string;
  private readonly _title: string;
  private readonly _author: string;
  private _coverUrl: string;
  private readonly _publisher: string;
  private _shelf: Shelf;
  private _copyCount: number;
  private _acquisition: AcquisitionRecord | null;
  private _readingStatus: ReadingStatus;
  private _series: string;
  private _description: string;
  private _published: string;
  private _pageCount: number;
  private _subjects: string;
  private _format: BookFormat;

  constructor(props: BookProps) {
    this._isbn = props.isbn;
    this._title = props.title;
    this._author = props.author;
    this._coverUrl = props.coverUrl;
    this._publisher = props.publisher;
    this._shelf = props.shelf;
    this._copyCount = props.copyCount ?? 1;
    this._acquisition = props.acquisition ?? null;
    this._readingStatus = props.readingStatus ?? ReadingStatus.UNREAD;
    this._series = props.series ?? "";
    this._description = props.description ?? "";
    this._published = props.published ?? "";
    this._pageCount = props.pageCount ?? 0;
    this._subjects = props.subjects ?? "";
    this._format = props.format ?? BookFormat.UNKNOWN;
  }

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
  get acquisition(): AcquisitionRecord | null {
    return this._acquisition;
  }
  get acquiredAs(): Acquisition | null {
    return this._acquisition?.kind ?? null;
  }
  get giftedBy(): string | null {
    return this._acquisition?.giftedBy ?? null;
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
  get format(): BookFormat {
    return this._format;
  }
  // Duplicate ISBN: increment copies, do not insert a second row.
  addCopy(): void {
    this._copyCount += 1;
  }

  // Purchase or Gift; an incomplete record (gift with no giver) is rejected.
  acquire(record: AcquisitionRecord): void {
    if (!record.isComplete()) {
      throw new GiftSourceRequiredError(this._isbn);
    }
    this._acquisition = record;
  }

  setReadingStatus(status: ReadingStatus): void {
    this._readingStatus = status;
  }

  // The owner's choice of cover: a source's image, or a photo of their own copy.
  changeCover(url: string): void {
    this._coverUrl = url.trim();
  }

  // Only empty facts are filled; anything already known is kept.
  fillFacts(facts: BookFacts): void {
    this._series = this._series.trim() || facts.series.trim();
    this._description = this._description.trim() || facts.description.trim();
    this._published = this._published.trim() || facts.published.trim();
    this._pageCount = this._pageCount || facts.pageCount;
    this._subjects = this._subjects.trim() || facts.subjects.trim();
    if (this._format === BookFormat.UNKNOWN) {
      this._format = facts.format;
    }
  }

  // Wanted → Owned requires a complete Purchase or Gift.
  moveTo(shelf: Shelf): void {
    if (this._shelf === Shelf.WANTED && shelf === Shelf.OWNED) {
      this.assertAcquired();
    }
    this._shelf = shelf;
  }

  // Throws unless the book has a complete Purchase or Gift.
  assertAcquired(): void {
    if (this._acquisition === null) {
      throw new NotAcquiredError(this._isbn);
    }
    if (!this._acquisition.isComplete()) {
      throw new GiftSourceRequiredError(this._isbn);
    }
  }
}
