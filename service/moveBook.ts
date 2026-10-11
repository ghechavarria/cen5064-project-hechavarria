/**
 * Service: MoveBookToShelfUseCase — move a book between Owned and Wanted. Moving
 * to Owned records the purchase or gift first; the Domain refuses an incomplete one.
 */
import { AcquisitionRecord, Book, Shelf } from "../domain";
import { LibraryUseCase } from "./libraryUseCase";

export class MoveBookToShelfUseCase extends LibraryUseCase {
  execute(
    ownerId: string,
    isbn: string,
    targetShelf: Shelf,
    acquisition?: AcquisitionRecord,
  ): Promise<Book> {
    return this.updateBook(ownerId, isbn, (book) => {
      if (acquisition) {
        book.acquire(acquisition);
      }
      book.moveTo(targetShelf);
    });
  }
}
