/**
 * Service: SyncLibraryUseCase — keeps the phone's copy of an account's library
 * and the account's backup in step (core feature 4, ADR-012).
 *
 * Offline-first: the phone's copy is always the one the app shows. Per book,
 * the latest change wins (ADR-012); after the first sync only the changes
 * since the last one travel (ADR-013). A deleted
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

  // Incremental (ADR-013): fetch only what the backup stored after the last
  // sync's cursor, and send only what changed on this phone since it was last
  // sent. The first sync of an account on this phone has no cursor, so it
  // compares the whole library instead.
  async execute(accountId: string): Promise<SyncReport> {
    const since = await this.store.syncCursor(accountId);
    return since === null ? this.fullSync(accountId) : this.syncSince(accountId, since);
  }

  private async syncSince(accountId: string, since: number): Promise<SyncReport> {
    const changes = await this.backup.pull(accountId, since);
    const downloaded = await this.store.applyVersions(accountId, changes.versions);
    await this.saveCursor(accountId, changes.cursor);
    // Read after applying: a book just replaced by a newer copy isn't sent back.
    const unsent = await this.store.unsentVersions(accountId);
    if (unsent.length > 0) {
      await this.backup.push(accountId, unsent);
      await this.store.markSent(accountId, unsent);
    }
    return { downloaded, uploaded: unsent.length };
  }

  private async fullSync(accountId: string): Promise<SyncReport> {
    const [local, remote] = await Promise.all([this.store.versions(accountId), this.backup.pull(accountId, null)]);
    const download = SyncLibraryUseCase.newerThan(remote.versions, local);
    const upload = SyncLibraryUseCase.newerThan(local, remote.versions);
    const downloaded = download.length > 0 ? await this.store.applyVersions(accountId, download) : 0;
    if (upload.length > 0) {
      await this.backup.push(accountId, upload);
    }
    // Every local version is now on the backup, or was replaced by a newer one.
    await this.store.markSent(accountId, local);
    // An empty backup has no cursor yet: 0 means "everything", so the next sync
    // is already incremental (it fetches what was just sent once, and ignores it).
    await this.store.saveSyncCursor(accountId, remote.cursor ?? 0);
    return { downloaded, uploaded: upload.length };
  }

  private async saveCursor(accountId: string, cursor: number | null): Promise<void> {
    if (cursor !== null) {
      await this.store.saveSyncCursor(accountId, cursor);
    }
  }

  // Calls onChange when another phone changes this account's backup, so the
  // caller can sync straight away. Returns a function that stops watching.
  watch(accountId: string, onChange: () => void): () => void {
    return this.backup.watch(accountId, onChange);
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
