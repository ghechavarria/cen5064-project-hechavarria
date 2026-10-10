/**
 * Service: LibraryUseCase — abstract base for use cases that read or change
 * the owner's library. Holds the repository and the shared
 * load → get → change → save steps so subclasses only state the change.
 */
import { Book, PersonalLibrary } from "../domain";
import { BookRepository } from "./ports";

export abstract class LibraryUseCase {
  constructor(protected readonly repository: BookRepository) {}

  protected library(ownerId: string): Promise<PersonalLibrary> {
    return this.repository.loadLibrary(ownerId);
  }

  // Template method: load the book, let the subclass change it, then save.
  protected async updateBook(
    ownerId: string,
    isbn: string,
    change: (book: Book) => void,
  ): Promise<Book> {
    const book = (await this.library(ownerId)).get(isbn);
    change(book);
    return this.repository.save(ownerId, book);
  }
}
