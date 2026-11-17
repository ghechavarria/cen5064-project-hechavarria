/**
 * Data: SupabaseLibraryBackup — the LibraryBackup port on the library_books
 * table (ADR-012). Rows travel through BookRowMapper like every other store, so
 * a damaged or older row gets the same safe defaults. Any failure, offline
 * included, comes out as SyncUnavailableError: the phone keeps its copy and
 * syncs later.
 */
import { BackupChanges, BookVersion, LibraryBackup, SyncUnavailableError } from "../service/ports";
import { BookRow, BookRowMapper, StoredRow } from "./bookRowMapper";
import type { LibraryBooksTable, PageStart, RemoteBookRow, StoredRemoteRow, SupabaseError } from "./supabase";

// Rows per request. Supabase returns at most 1000 rows per read by default.
const PAGE_SIZE = 500;

// A pull since a cursor starts this much earlier (ADR-013). A row is stamped
// when its write runs and becomes visible when that write commits; a slow
// write can commit just after a newer one was read. Rows seen twice are harmless.
const OVERLAP_MS = 30_000;

/** Null Object: no Supabase settings, so there is no backup to reach (and nobody signs in to ask). */
export class UnconfiguredLibraryBackup implements LibraryBackup {
  async pull(): Promise<BackupChanges> {
    throw new SyncUnavailableError("accounts are not set up");
  }

  async push(): Promise<void> {
    throw new SyncUnavailableError("accounts are not set up");
  }

  watch(): () => void {
    return () => undefined;
  }
}

export class SupabaseLibraryBackup implements LibraryBackup {
  constructor(private readonly table: LibraryBooksTable) {}

  // Every version this account has stored, or only those stored after `since`,
  // read a page at a time in the order the server stored them.
  async pull(ownerId: string, since: number | null): Promise<BackupChanges> {
    const rows: StoredRemoteRow[] = [];
    let start: PageStart | null = since === null ? null : { syncedAt: since - OVERLAP_MS, isbn: null };
    for (;;) {
      const { data, error } = await SupabaseLibraryBackup.attempt(() => this.table.page(ownerId, start, PAGE_SIZE));
      SupabaseLibraryBackup.check(error);
      const page = data ?? [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) {
        break;
      }
      const last = page[page.length - 1];
      start = { syncedAt: last.synced_at, isbn: last.isbn };
    }
    const versions = rows
      .map(SupabaseLibraryBackup.toStored)
      .filter(BookRowMapper.isUsable)
      .map((row) => BookRowMapper.toVersion(BookRowMapper.withDefaults(row)));
    // The newest stamp seen; with nothing new, the old cursor still holds.
    const cursor = rows.reduce<number | null>((newest, row) => Math.max(newest ?? row.synced_at, row.synced_at), since);
    return { versions, cursor };
  }

  async push(ownerId: string, versions: BookVersion[]): Promise<void> {
    const rows = versions.map((version) => SupabaseLibraryBackup.toRemote(BookRowMapper.fromVersion(ownerId, version)));
    for (let from = 0; from < rows.length; from += PAGE_SIZE) {
      const { error } = await SupabaseLibraryBackup.attempt(() => this.table.upsert(rows.slice(from, from + PAGE_SIZE)));
      SupabaseLibraryBackup.check(error);
    }
  }

  // Supabase Realtime tells this phone when the account's rows change.
  watch(ownerId: string, onChange: () => void): () => void {
    return this.table.watch(ownerId, onChange);
  }

  // A request that throws (no network) is reported like a request that failed.
  private static async attempt<T extends { error: SupabaseError | null }>(request: () => PromiseLike<T>): Promise<T> {
    try {
      return await request();
    } catch (thrown) {
      return { error: { message: String(thrown) } } as T;
    }
  }

  private static check(error: SupabaseError | null): void {
    if (error) {
      throw new SyncUnavailableError(`library_books: ${error.message}`);
    }
  }

  private static toStored(row: RemoteBookRow): StoredRow {
    return {
      ownerId: row.owner_id,
      isbn: row.isbn,
      title: row.title,
      author: row.author,
      coverUrl: row.cover_url,
      publisher: row.publisher,
      shelf: row.shelf as StoredRow["shelf"],
      copyCount: row.copy_count,
      acquiredAs: row.acquired_as as StoredRow["acquiredAs"],
      giftedBy: row.gifted_by,
      readingStatus: row.reading_status as StoredRow["readingStatus"],
      series: row.series,
      description: row.description,
      published: row.published,
      pageCount: row.page_count,
      subjects: row.subjects,
      format: row.format as StoredRow["format"],
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      addedAt: row.added_at,
    };
  }

  private static toRemote(row: BookRow): RemoteBookRow {
    return {
      owner_id: row.ownerId,
      isbn: row.isbn,
      title: row.title,
      author: row.author,
      cover_url: row.coverUrl,
      publisher: row.publisher,
      shelf: row.shelf,
      copy_count: row.copyCount,
      acquired_as: row.acquiredAs,
      gifted_by: row.giftedBy,
      reading_status: row.readingStatus,
      series: row.series,
      description: row.description,
      published: row.published,
      page_count: row.pageCount,
      subjects: row.subjects,
      format: row.format,
      updated_at: row.updatedAt,
      deleted_at: row.deletedAt,
      added_at: row.addedAt,
    };
  }
}
