/**
 * Service: ChangeAcquisitionUseCase — correct how an Owned book was acquired:
 * purchased, or gifted and by whom. The domain keeps the rules: only an Owned
 * book records it, and a gift needs the giver's name.
 */
import { AcquisitionRecord, Book } from "../domain";
import { LibraryUseCase } from "./libraryUseCase";

export class ChangeAcquisitionUseCase extends LibraryUseCase {
  execute(ownerId: string, isbn: string, record: AcquisitionRecord): Promise<Book> {
    return this.updateBook(ownerId, isbn, (book) => book.changeAcquisition(record));
  }
}
