/**
 * Service: LookupIsbnUseCase — what the book sources know about an ISBN; never saves.
 */
import { Isbn } from "../domain";
import { BookMetadata, IsbnLookup } from "./ports";

export class LookupIsbnUseCase {
  constructor(private readonly isbnLookup: IsbnLookup) {}

  async execute(isbn: string): Promise<BookMetadata> {
    return this.isbnLookup.byIsbn(Isbn.normalize(isbn));
  }
}
