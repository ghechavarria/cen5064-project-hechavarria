/**
 * Data: SupabaseLibraryBackup — the LibraryBackup port on the library_books
 * table (ADR-012). Rows travel through BookRowMapper like every other store, so
 * a damaged or older row gets the same safe defaults. Any failure, offline
 * included, comes out as SyncUnavailableError: the phone keeps its copy and
 * syncs later.
 */
import { BookVersion, LibraryBackup, SyncUnavailableError } from "../service/ports";
import { BookRow, BookRowMapper, StoredRow } from "./bookRowMapper";
import type { LibraryBooksTable, RemoteBookRow, SupabaseError } from "./supabase";

// Rows per request. Supabase returns at most 1000 rows per read by default.
const PAGE_SIZE = 500;

export class SupabaseLibraryBackup implements LibraryBackup {
  constructor(private readonly table: LibraryBooksTable) {}

  // Every version this account has stored, read a page at a time.
  async pull(ownerId: string): Promise<BookVersion[]> {
    const rows: RemoteBookRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await SupabaseLibraryBackup.attempt(() => this.table.page(ownerId, from, from + PAGE_SIZE - 1));
      SupabaseLibraryBackup.check(error);
      rows.push(...(data ?? []));
      if ((data ?? []).length < PAGE_SIZE) {
        break;
      }
    }
    return rows
      .map(SupabaseLibraryBackup.toStored)
      .filter(BookRowMapper.isUsable)
      .map((row) => BookRowMapper.toVersion(BookRowMapper.withDefaults(row)));
  }

  async push(ownerId: string, versions: BookVersion[]): Promise<void> {
    const rows = versions.map((version) => SupabaseLibraryBackup.toRemote(BookRowMapper.fromVersion(ownerId, version)));
    for (let from = 0; from < rows.length; from += PAGE_SIZE) {
      const { error } = await SupabaseLibraryBackup.attempt(() => this.table.upsert(rows.slice(from, from + PAGE_SIZE)));
      SupabaseLibraryBackup.check(error);
    }
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
    };
  }
}
