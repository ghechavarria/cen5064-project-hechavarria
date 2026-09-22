/**
 * Service: LookupIsbnUseCase — Open Library metadata, no save.
 * Must not import React, SQLite, or fetch.
 */
import { normalizeIsbn } from "../domain";
import { BookMetadata, IsbnLookup } from "./ports";

export class LookupIsbnUseCase {
  constructor(private readonly isbnLookup: IsbnLookup) {}

  async execute(isbn: string): Promise<BookMetadata> {
    return this.isbnLookup.byIsbn(normalizeIsbn(isbn));
  }
}
