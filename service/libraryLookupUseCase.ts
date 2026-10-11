/**
 * Service: LibraryLookupUseCase — abstract base for use cases that also ask
 * the book sources (through the IsbnLookup port). Second level of the use-case
 * hierarchy: LibraryUseCase → LibraryLookupUseCase → ScanBook / FillMissingFacts.
 */
import { Book } from "../domain";
import { LibraryUseCase } from "./libraryUseCase";
import { BookRepository, IsbnLookup } from "./ports";

export abstract class LibraryLookupUseCase extends LibraryUseCase {
  constructor(
    repository: BookRepository,
    protected readonly isbnLookup: IsbnLookup,
  ) {
    super(repository);
  }

  // Fill the book's empty facts from the book sources. Best effort: a failed lookup changes nothing.
  protected async tryFillFacts(book: Book): Promise<void> {
    try {
      book.fillFacts(await this.isbnLookup.byIsbn(book.isbn));
    } catch {
      /* offline or unknown ISBN: keep what we have */
    }
  }
}
