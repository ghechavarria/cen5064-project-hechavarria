/**
 * Service: IsbnLookup and BookRepository ports (interfaces the Data tier implements).
 */
import { Book, BookFacts, PersonalLibrary } from "../domain";

/** What the book sources know about one ISBN (one edition). */
export type BookMetadata = BookFacts & {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  // Best cover first; coverCandidates lists every distinct cover the sources offer,
  // so the owner can pick the one that matches their copy.
  coverUrl: string;
  coverCandidates: string[];
};

export interface IsbnLookup {
  byIsbn(isbn: string): Promise<BookMetadata>;
}

/** The ISBN metadata cache, split out so CachingIsbnLookup depends only on what it uses. */
export interface IsbnCache {
  cachedIsbn(isbn: string): Promise<BookMetadata | null>;
  cacheIsbn(metadata: BookMetadata): Promise<void>;
}

export interface BookRepository extends IsbnCache {
  loadLibrary(ownerId: string): Promise<PersonalLibrary>;
  save(ownerId: string, book: Book): Promise<Book>;
  delete(ownerId: string, isbn: string): Promise<void>;
}
