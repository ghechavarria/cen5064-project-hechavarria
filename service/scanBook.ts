/**
 * Service: ScanBookUseCase — persist after UI confirm; duplicate ISBN calls addCopy.
 * Must not import React, SQLite, or fetch.
 */
import { Book, PersonalLibrary, ReadingStatus, Shelf, normalizeIsbn } from "../domain";
import { BookNotFoundError } from "../domain/exceptions";
import { BookRepository, IsbnLookup } from "./ports";

export class ScanBookUseCase {
  constructor(
    private readonly repository: BookRepository,
    private readonly isbnLookup: IsbnLookup,
  ) {}

  async execute(
    ownerId: string,
    isbn: string,
    targetShelf: Shelf,
    readingStatus: ReadingStatus = ReadingStatus.UNREAD,
  ): Promise<Book> {
    const key = normalizeIsbn(isbn);
    const library: PersonalLibrary = await this.repository.loadLibrary(ownerId);
    try {
      const existing = library.get(key);
      existing.addCopy();
      try {
        existing.fillFacts(await this.isbnLookup.byIsbn(key));
      } catch {
        /* keep copies even if lookup fails */
      }
      return this.repository.save(ownerId, existing);
    } catch (error) {
      if (!(error instanceof BookNotFoundError)) {
        throw error;
      }
    }
    const metadata = await this.isbnLookup.byIsbn(key);
    const book = new Book(
      metadata.isbn,
      metadata.title,
      metadata.author,
      metadata.coverUrl,
      metadata.publisher,
      targetShelf,
      1,
      null,
      null,
      readingStatus,
      metadata.series,
      metadata.description,
      metadata.published,
      metadata.pageCount,
      metadata.subjects,
    );
    library.addBook(book);
    return this.repository.save(ownerId, book);
  }
}
