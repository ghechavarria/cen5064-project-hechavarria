/**
 * Service: SetReadingStatusUseCase — UNREAD / READ on an existing Book.
 */
import { Book, ReadingStatus } from "../domain";
import { LibraryUseCase } from "./libraryUseCase";

export class SetReadingStatusUseCase extends LibraryUseCase {
  execute(ownerId: string, isbn: string, status: ReadingStatus): Promise<Book> {
    return this.updateBook(ownerId, isbn, (book) => book.setReadingStatus(status));
  }
}
