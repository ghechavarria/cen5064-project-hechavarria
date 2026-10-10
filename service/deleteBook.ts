/**
 * Service: DeleteBookUseCase — remove a Book (every copy) from the library.
 */
import { LibraryUseCase } from "./libraryUseCase";

export class DeleteBookUseCase extends LibraryUseCase {
  async execute(ownerId: string, isbn: string): Promise<void> {
    // The domain refuses an ISBN that is not in the library (BookNotFoundError).
    (await this.library(ownerId)).remove(isbn);
    return this.repository.delete(ownerId, isbn);
  }
}
