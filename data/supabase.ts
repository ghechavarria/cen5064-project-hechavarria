/**
 * Data: SupabaseConnection — creates the one Supabase client (ADR-012) and
 * describes the few calls the adapters make on it. The adapters depend on these
 * narrow shapes, not on the whole client, so tests hand them small fakes; tsc
 * checks that the real client still fits.
 *
 * Only the project URL and its public (anon / publishable) key are used. Row
 * level security on library_books keeps each account to its own rows. The
 * service_role key never belongs in the app.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { LiveChanges } from "./liveChanges";
import { ServerClock } from "./serverClock";

/** An error as Supabase returns it: a message, and usually a code or HTTP status. */
export type SupabaseError = { message: string; code?: string; status?: number };

/** The part of a Supabase user the app reads. */
export type SupabaseUser = { id: string; email?: string; created_at?: string };
type SessionShape = { user: SupabaseUser };
type Answer<T> = Promise<{ data: T; error: SupabaseError | null }>;

/** The Supabase Auth calls SupabaseAccounts makes. */
export interface SupabaseAuth {
  getSession(): Answer<{ session: SessionShape | null }>;
  signUp(credentials: { email: string; password: string }): Answer<{ user: SupabaseUser | null; session: SessionShape | null }>;
  signInWithPassword(credentials: { email: string; password: string }): Answer<{ user: SupabaseUser | null }>;
  signOut(): Promise<{ error: SupabaseError | null }>;
  onAuthStateChange(callback: (event: string, session: SessionShape | null) => void): {
    data: { subscription: { unsubscribe(): void } };
  };
}

/** One row of library_books as the app writes it (snake_case). */
export type RemoteBookRow = {
  owner_id: string;
  isbn: string;
  title: string;
  author: string;
  cover_url: string;
  publisher: string;
  shelf: string;
  copy_count: number;
  acquired_as: string | null;
  gifted_by: string | null;
  reading_status: string;
  series: string;
  description: string;
  published: string;
  page_count: number;
  subjects: string;
  format: string;
  updated_at: number;
  deleted_at: number | null;
  added_at: number | null;
};

/** A row as the database returns it: plus synced_at, the server's own stamp (ADR-013). */
export type StoredRemoteRow = RemoteBookRow & { synced_at: number };

/**
 * Where a page of rows starts: after this synced_at, or, with an ISBN, after this
 * exact row (rows stored in the same millisecond are told apart by ISBN).
 */
export type PageStart = { syncedAt: number; isbn: string | null };

type Result<T> = { data: T; error: SupabaseError | null };

/**
 * The table calls SupabaseLibraryBackup makes: one owner's rows a page at a
 * time in the order the server stored them, an upsert, and a live watch on
 * that owner's rows.
 */
export interface LibraryBooksTable {
  page(ownerId: string, start: PageStart | null, limit: number): PromiseLike<Result<StoredRemoteRow[] | null>>;
  upsert(rows: RemoteBookRow[]): PromiseLike<{ error: SupabaseError | null }>;
  watch(ownerId: string, onChange: () => void): () => void;
}

/**
 * library_books through the real client. Pages are read by key (synced_at, then
 * ISBN), not by position, so a row changed while paging can't shift another out.
 */
class SupabaseLibraryBooks implements LibraryBooksTable {
  constructor(private readonly client: SupabaseClient) {}

  page(ownerId: string, start: PageStart | null, limit: number): PromiseLike<Result<StoredRemoteRow[] | null>> {
    let query = this.client.from("library_books").select("*").eq("owner_id", ownerId);
    if (start && start.isbn === null) {
      query = query.gte("synced_at", start.syncedAt);
    } else if (start) {
      // An ISBN is digits (and maybe an X); quoted anyway so it is read as a value.
      query = query.or(`synced_at.gt.${start.syncedAt},and(synced_at.eq.${start.syncedAt},isbn.gt."${start.isbn}")`);
    }
    return query.order("synced_at").order("isbn").limit(limit);
  }

  upsert(rows: RemoteBookRow[]): PromiseLike<{ error: SupabaseError | null }> {
    return this.client.from("library_books").upsert(rows, { onConflict: "owner_id,isbn" });
  }

  // Realtime: any insert, update or delete of this owner's rows. Row level
  // security applies here too, so a phone only hears about its own account.
  // LiveChanges reopens the channel when it fails and catches up when it's live.
  watch(ownerId: string, onChange: () => void): () => void {
    return LiveChanges.watch((events) => {
      const channel = this.client
        .channel(`library_books:${ownerId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "library_books", filter: `owner_id=eq.${ownerId}` },
          () => events.changed(),
        )
        // The database's answer to the subscription arrives as a system message:
        // "ok" once changes will flow, "error" if it refused (e.g. joined before sign-in).
        .on("system", {}, (message: { extension?: string; status?: string }) => {
          if (message.extension === "postgres_changes") {
            if (message.status === "ok") {
              events.live();
            } else {
              events.broken();
            }
          }
        })
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            events.broken();
          }
        });
      return () => void this.client.removeChannel(channel);
    }, onChange);
  }
}

export class SupabaseConnection {
  private constructor(
    readonly auth: SupabaseAuth & { startAutoRefresh(): Promise<void>; stopAutoRefresh(): Promise<void> },
    readonly books: LibraryBooksTable,
  ) {}

  // The session is kept in AsyncStorage so a signed-in phone stays signed in.
  // Expo Go cannot receive sign-in links, so nothing is read from a URL.
  // Every answer's Date header sets `clock` to the server's time (ADR-013).
  static open(url: string, publicKey: string, clock: ServerClock): SupabaseConnection {
    const client = createClient(url, publicKey, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
      global: { fetch: clock.watching((input, init) => fetch(input, init)) },
    });
    return new SupabaseConnection(client.auth, new SupabaseLibraryBooks(client));
  }

  // Supabase refreshes the sign-in token only while the app is on screen (React Native guidance).
  keepSessionFresh(appOnScreen: boolean): void {
    void (appOnScreen ? this.auth.startAutoRefresh() : this.auth.stopAutoRefresh());
  }
}
