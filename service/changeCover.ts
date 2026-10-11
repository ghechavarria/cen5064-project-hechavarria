/**
 * Service: ChangeCoverUseCase — replace a book's cover with one the owner chose
 * (usually a photo of their own copy).
 */
import { Book } from "../domain";
import { LibraryUseCase } from "./libraryUseCase";

export class ChangeCoverUseCase extends LibraryUseCase {
  execute(ownerId: string, isbn: string, coverUrl: string): Promise<Book> {
    return this.updateBook(ownerId, isbn, (book) => book.changeCover(coverUrl));
  }
}
