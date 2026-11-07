/**
 * Service: SyncLibraryUseCase — keeps the phone's copy of an account's library
 * and the account's backup in step (core feature 4, ADR-012).
 *
 * Offline-first: the phone's copy is always the one the app shows. A sync
 * compares the two copies book by book and the latest change wins; a deleted
 * book travels as a tombstone, so it is deleted on the other side too. If the
 * backup can't be reached, SyncUnavailableError is thrown and nothing is lost;
 * the next sync catches up.
 */
import { BookRepository, BookVersion, LibraryBackup, SyncStore, SyncUnavailableError } from "./ports";

/** How many books each side received in one sync. */
export type SyncReport = { downloaded: number; uploaded: number };

export class SyncLibraryUseCase {
  constructor(
    private readonly repository: BookRepository,
    private readonly store: SyncStore,
    private readonly backup: LibraryBackup,
  ) {}

  async execute(accountId: string): Promise<SyncReport> {
    const [local, remote] = await Promise.all([this.store.versions(accountId), this.backup.pull(accountId)]);
    const download = SyncLibraryUseCase.newerThan(remote, local);
    const upload = SyncLibraryUseCase.newerThan(local, remote);
    if (download.length > 0) {
      await this.store.applyVersions(accountId, download);
    }
    if (upload.length > 0) {
      await this.backup.push(accountId, upload);
    }
    return { downloaded: download.length, uploaded: upload.length };
  }

  // First sign-in on this phone: the books kept before signing in move into the
  // account. Sync first so the account's books are here, move, then sync the result.
  // Offline, the books still move (so none seem to vanish) and sync later.
  async signedIn(accountId: string, deviceOwnerId: string): Promise<SyncReport> {
    try {
      await this.execute(accountId);
    } catch (error) {
      if (!(error instanceof SyncUnavailableError)) {
        throw error;
      }
    }
    await this.adopt(deviceOwnerId, accountId);
    return this.execute(accountId);
  }

  // Moves every book from one owner to another. A book both already have adds
  // its copies (the duplicate-ISBN rule); the moved books leave tombstones behind.
  async adopt(fromOwnerId: string, toOwnerId: string): Promise<number> {
    const moving = (await this.repository.loadLibrary(fromOwnerId)).books;
    const target = await this.repository.loadLibrary(toOwnerId);
    for (const book of moving) {
      if (target.has(book.isbn)) {
        const kept = target.get(book.isbn);
        kept.addCopies(book.copyCount);
        await this.repository.save(toOwnerId, kept);
      } else {
        await this.repository.save(toOwnerId, book);
      }
      await this.repository.delete(fromOwnerId, book.isbn);
    }
    return moving.length;
  }

  // The versions in `mine` that the other side lacks or holds an older copy of.
  // Equal timestamps mean the same change, so neither side sends it.
  private static newerThan(mine: BookVersion[], theirs: BookVersion[]): BookVersion[] {
    const theirTimes = new Map(theirs.map((version) => [version.book.isbn, version.updatedAt]));
    return mine.filter((version) => version.updatedAt > (theirTimes.get(version.book.isbn) ?? -1));
  }
}
