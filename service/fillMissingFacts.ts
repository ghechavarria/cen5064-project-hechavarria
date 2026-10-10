/**
 * Service: FillMissingFactsUseCase — at start-up, look up books that still lack
 * a series or a format, and save any that the sources can now fill in.
 */
import { Book, BookFormat } from "../domain";
import { LibraryLookupUseCase } from "./libraryLookupUseCase";

export class FillMissingFactsUseCase extends LibraryLookupUseCase {
  async execute(ownerId: string): Promise<void> {
    for (const book of (await this.library(ownerId)).books) {
      if (FillMissingFactsUseCase.isComplete(book)) {
        continue;
      }
      const before = [book.series, book.format].join("|");
      await this.tryFillFacts(book);
      if ([book.series, book.format].join("|") !== before) {
        await this.repository.save(ownerId, book);
      }
    }
  }

  private static isComplete(book: Book): boolean {
    return book.series.trim() !== "" && book.format !== BookFormat.UNKNOWN;
  }
}
