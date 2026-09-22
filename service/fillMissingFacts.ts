/**
 * Service: FillMissingFactsUseCase — backfill empty series from Open Library.
 * Must not import React, SQLite, or fetch.
 */
import { BookRepository, IsbnLookup } from "./ports";

export class FillMissingFactsUseCase {
  constructor(
    private readonly repository: BookRepository,
    private readonly isbnLookup: IsbnLookup,
  ) {}

  async execute(ownerId: string): Promise<void> {
    for (const book of (await this.repository.loadLibrary(ownerId)).books) {
      if (book.series.trim()) {
        continue;
      }
      try {
        book.fillFacts(await this.isbnLookup.byIsbn(book.isbn));
      } catch {
        continue;
      }
      if (book.series.trim()) {
        await this.repository.save(ownerId, book);
      }
    }
  }
}
