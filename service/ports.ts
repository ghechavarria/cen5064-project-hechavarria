/**
 * Service: the IsbnLookup, IsbnCache and BookRepository ports (interfaces the
 * Data tier implements), and the one error a book source may throw.
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

/**
 * A book source could not answer (offline, timed out, rate-limited, or sent
 * unreadable data). Data adapters throw it; the view model shows its message.
 * Not a DomainError: nothing about the ISBN is wrong, so the owner can retry.
 */
export class BookSourceUnavailableError extends Error {
  constructor(readonly detail: string) {
    super("Couldn't reach the book sources. Check your connection and try again.");
    this.name = "BookSourceUnavailableError";
  }
}

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
