/**
 * Presentation model: LibraryController (screen intents → Service use cases) and
 * LibraryView (one read-only snapshot of the shelves for rendering).
 * Plain classes, no React: the screens stay thin and this logic is testable.
 */
import { AcquisitionRecord, Book, PersonalLibrary, ReadingStatus, Shelf } from "../../domain";
import type { ScanChoices, UseCases } from "../../service";
import { BookMetadata } from "../../service/ports";

export class LibraryView {
  readonly owned: Book[];
  readonly wanted: Book[];
  private readonly ownedByStatus: Record<ReadingStatus, Book[]>;

  constructor(private readonly library: PersonalLibrary) {
    this.owned = library.booksOn(Shelf.OWNED);
    this.wanted = library.booksOn(Shelf.WANTED);
    this.ownedByStatus = {
      [ReadingStatus.UNREAD]: library.booksOn(Shelf.OWNED, ReadingStatus.UNREAD),
      [ReadingStatus.READ]: library.booksOn(Shelf.OWNED, ReadingStatus.READ),
    };
  }

  // Shown before the first load finishes.
  static empty(): LibraryView {
    return new LibraryView(new PersonalLibrary());
  }

  // TBR is a view of Owned, split by reading status.
  toBeRead(status: ReadingStatus): Book[] {
    return this.ownedByStatus[status];
  }

  find(isbn: string | null): Book | null {
    return isbn && this.library.has(isbn) ? this.library.get(isbn) : null;
  }
}

export type LookupResult = { metadata: BookMetadata; alreadyInLibrary: boolean };

export class LibraryController {
  constructor(
    private readonly useCases: UseCases,
    private readonly ownerId: string,
  ) {}

  async view(): Promise<LibraryView> {
    return new LibraryView(await this.useCases.loadLibrary.execute(this.ownerId));
  }

  async lookup(code: string): Promise<LookupResult> {
    const metadata = await this.useCases.lookup.execute(code);
    const view = await this.view();
    return { metadata, alreadyInLibrary: view.find(metadata.isbn) !== null };
  }

  scan(
    metadata: BookMetadata,
    shelf: Shelf,
    status: ReadingStatus,
    acquisition?: AcquisitionRecord,
    choices?: ScanChoices,
  ): Promise<Book> {
    return this.useCases.scan.execute(this.ownerId, metadata.isbn, shelf, status, acquisition, choices);
  }

  changeCover(isbn: string, coverUrl: string): Promise<Book> {
    return this.useCases.changeCover.execute(this.ownerId, isbn, coverUrl);
  }

  async move(
    isbn: string,
    target: Shelf,
    status: ReadingStatus,
    acquisition?: AcquisitionRecord,
  ): Promise<Book> {
    await this.useCases.move.execute(this.ownerId, isbn, target, acquisition);
    return this.setReading(isbn, status);
  }

  setReading(isbn: string, status: ReadingStatus): Promise<Book> {
    return this.useCases.setStatus.execute(this.ownerId, isbn, status);
  }

  remove(isbn: string): Promise<void> {
    return this.useCases.removeBook.execute(this.ownerId, isbn);
  }

  fillMissingFacts(): Promise<void> {
    return this.useCases.fillMissing.execute(this.ownerId);
  }
}
