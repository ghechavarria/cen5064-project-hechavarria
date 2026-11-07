/**
 * Service: the ports the Data tier implements (IsbnLookup, IsbnCache,
 * BookRepository, and for account sync SyncStore, LibraryBackup and Accounts),
 * and the errors those adapters may throw.
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

/** The ISBN metadata cache. Only CachingIsbnLookup uses it. */
export interface IsbnCache {
  cachedIsbn(isbn: string): Promise<BookMetadata | null>;
  cacheIsbn(metadata: BookMetadata): Promise<void>;
}

/**
 * Where an owner's library is stored. Only what the use cases call: the ISBN
 * cache and the sync side are separate ports (Interface Segregation), so a store
 * implements only what it needs. The local stores implement all three.
 */
export interface BookRepository {
  loadLibrary(ownerId: string): Promise<PersonalLibrary>;
  save(ownerId: string, book: Book): Promise<Book>;
  delete(ownerId: string, isbn: string): Promise<void>;
}

// --- Account sync (core feature 4, ADR-012) ---

/**
 * One stored version of a book, as sync compares them: the book, when it last
 * changed (milliseconds since 1970), and when it was deleted (null if it wasn't).
 * A deleted book is kept as a tombstone so other phones delete it too.
 */
export type BookVersion = { book: Book; updatedAt: number; deletedAt: number | null };

/** The local store's sync side: every version for an owner, tombstones included. */
export interface SyncStore {
  versions(ownerId: string): Promise<BookVersion[]>;
  // Stores each version as given (timestamps kept, not renewed), but only where
  // it is newer than the stored copy of that book.
  applyVersions(ownerId: string, versions: BookVersion[]): Promise<void>;
}

/** The account's copy of the library, kept outside the phone. */
export interface LibraryBackup {
  pull(ownerId: string): Promise<BookVersion[]>;
  push(ownerId: string, versions: BookVersion[]): Promise<void>;
  // Calls onChange whenever this account's backup changes (another phone
  // synced), so this phone can sync at once. Returns a function that stops it.
  watch(ownerId: string, onChange: () => void): () => void;
}

/** A signed-in account; its id is the ownerId of its books. */
export type Account = { id: string; email: string };

/** Sign-up and sign-in. `configured` is false when no account service is set up. */
export interface Accounts {
  readonly configured: boolean;
  current(): Promise<Account | null>;
  // null when the account must confirm its email before signing in.
  signUp(email: string, password: string): Promise<Account | null>;
  signIn(email: string, password: string): Promise<Account>;
  signOut(): Promise<void>;
  // Called when the session changes elsewhere (e.g. it expires); returns an unsubscribe.
  onChange(listener: (account: Account | null) => void): () => void;
}

/** The account service refused or failed; the message is safe to show the owner. */
export class AccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountError";
  }
}

/** The library could not be synced; it stays safe on the phone and syncs later. */
export class SyncUnavailableError extends Error {
  constructor(readonly detail: string) {
    super("Couldn't sync your library right now. It's saved on this phone and will sync later.");
    this.name = "SyncUnavailableError";
  }
}
