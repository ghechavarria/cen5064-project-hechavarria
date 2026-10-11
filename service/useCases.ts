/**
 * Service: UseCases — every use case, built once from the two ports.
 * bootstrap.ts builds it with the real adapters; tests build it with memory /
 * fake adapters, so the wiring is written once.
 */
import { ChangeCoverUseCase } from "./changeCover";
import { DeleteBookUseCase } from "./deleteBook";
import { FillMissingFactsUseCase } from "./fillMissingFacts";
import { LoadLibraryUseCase } from "./loadLibrary";
import { LookupIsbnUseCase } from "./lookupIsbn";
import { MoveBookToShelfUseCase } from "./moveBook";
import { BookRepository, IsbnLookup } from "./ports";
import { ScanBookUseCase } from "./scanBook";
import { SetReadingStatusUseCase } from "./setReadingStatus";

export class UseCases {
  readonly loadLibrary: LoadLibraryUseCase;
  readonly lookup: LookupIsbnUseCase;
  readonly scan: ScanBookUseCase;
  readonly move: MoveBookToShelfUseCase;
  readonly setStatus: SetReadingStatusUseCase;
  readonly removeBook: DeleteBookUseCase;
  readonly fillMissing: FillMissingFactsUseCase;
  readonly changeCover: ChangeCoverUseCase;

  constructor(repository: BookRepository, isbnLookup: IsbnLookup) {
    this.loadLibrary = new LoadLibraryUseCase(repository);
    this.lookup = new LookupIsbnUseCase(isbnLookup);
    this.scan = new ScanBookUseCase(repository, isbnLookup);
    this.move = new MoveBookToShelfUseCase(repository);
    this.setStatus = new SetReadingStatusUseCase(repository);
    this.removeBook = new DeleteBookUseCase(repository);
    this.fillMissing = new FillMissingFactsUseCase(repository, isbnLookup);
    this.changeCover = new ChangeCoverUseCase(repository);
  }
}
