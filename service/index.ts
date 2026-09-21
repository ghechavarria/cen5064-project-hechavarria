/**
 * Service: use-case barrel. Presentation imports only from here.
 * Must not import React, SQLite, or fetch.
 */
export { DeleteBookUseCase } from "./deleteBook";
export { FillMissingFactsUseCase } from "./fillMissingFacts";
export { LookupIsbnUseCase } from "./lookupIsbn";
export { MoveBookToShelfUseCase } from "./moveBook";
export { ScanBookUseCase } from "./scanBook";
export { SetReadingStatusUseCase } from "./setReadingStatus";
export type { BookMetadata, BookRepository, IsbnLookup } from "./ports";
