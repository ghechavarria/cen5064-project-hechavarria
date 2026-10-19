/**
 * Service: ScanBookUseCase — save a scanned book after the user confirms it.
 * A duplicate ISBN adds a copy; a new ISBN becomes a new Book (Owned needs a Purchase or Gift).
 */
import { AcquisitionRecord, Book, BookFormat, Isbn, ReadingStatus, Shelf } from "../domain";
import { LibraryLookupUseCase } from "./libraryLookupUseCase";

/** What the owner settled while scanning: the cover that matches their copy, and its binding. */
export type ScanChoices = { coverUrl?: string; format?: BookFormat };

export class ScanBookUseCase extends LibraryLookupUseCase {
  async execute(
    ownerId: string,
    isbn: string,
    targetShelf: Shelf,
    readingStatus: ReadingStatus = ReadingStatus.UNREAD,
    acquisition?: AcquisitionRecord,
    choices: ScanChoices = {},
  ): Promise<Book> {
    const key = Isbn.parse(isbn);
    const library = await this.library(ownerId);

    // Already cataloged: one more copy, and top up any missing facts.
    if (library.has(key)) {
      const existing = library.get(key);
      existing.addCopy();
      await this.tryFillFacts(existing);
      return this.repository.save(ownerId, existing);
    }

    // New ISBN: build the Book from the sources plus the owner's choices;
    // addBook re-checks the Owned rule.
    const metadata = await this.isbnLookup.byIsbn(key);
    const book = new Book({
      ...metadata,
      coverUrl: choices.coverUrl ?? metadata.coverUrl,
      format: choices.format ?? metadata.format,
      shelf: targetShelf,
      readingStatus,
    });
    if (acquisition) {
      book.acquire(acquisition);
    }
    library.addBook(book);
    return this.repository.save(ownerId, book);
  }
}
