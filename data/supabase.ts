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

/** An error as Supabase returns it: a message, and usually a code or HTTP status. */
export type SupabaseError = { message: string; code?: string; status?: number };

/** The part of a Supabase user the app reads. */
export type SupabaseUser = { id: string; email?: string };
type SessionShape = { user: SupabaseUser };
type Answer<T> = Promise<{ data: T; error: SupabaseError | null }>;

/** The Supabase Auth calls SupabaseAccounts makes. */
export interface SupabaseAuth {
  getSession(): Answer<{ session: SessionShape | null }>;
  signUp(credentials: { email: string; password: string }): Answer<{ user: SupabaseUser | null; session: SessionShape | null }>;
  signInWithPassword(credentials: { email: string; password: string }): Answer<{ user: SupabaseUser | null }>;
  signOut(): Promise<{ error: SupabaseError | null }>;
  resetPasswordForEmail(email: string): Promise<{ error: SupabaseError | null }>;
  verifyOtp(params: { email: string; token: string; type: "recovery" }): Answer<{ user: SupabaseUser | null }>;
  updateUser(attributes: { password: string }): Answer<{ user: SupabaseUser | null }>;
  onAuthStateChange(callback: (event: string, session: SessionShape | null) => void): {
    data: { subscription: { unsubscribe(): void } };
  };
}

/** One row of library_books, as the database stores it (snake_case). */
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
};

type Result<T> = { data: T; error: SupabaseError | null };

/** The table calls SupabaseLibraryBackup makes: one owner's rows a page at a time, and an upsert. */
export interface LibraryBooksTable {
  page(ownerId: string, from: number, to: number): PromiseLike<Result<RemoteBookRow[] | null>>;
  upsert(rows: RemoteBookRow[]): PromiseLike<{ error: SupabaseError | null }>;
}

/** library_books through the real client. Rows come back in ISBN order so paging is stable. */
class SupabaseLibraryBooks implements LibraryBooksTable {
  constructor(private readonly client: SupabaseClient) {}

  page(ownerId: string, from: number, to: number): PromiseLike<Result<RemoteBookRow[] | null>> {
    return this.client.from("library_books").select("*").eq("owner_id", ownerId).order("isbn").range(from, to);
  }

  upsert(rows: RemoteBookRow[]): PromiseLike<{ error: SupabaseError | null }> {
    return this.client.from("library_books").upsert(rows, { onConflict: "owner_id,isbn" });
  }
}

export class SupabaseConnection {
  private constructor(
    readonly auth: SupabaseAuth & { startAutoRefresh(): Promise<void>; stopAutoRefresh(): Promise<void> },
    readonly books: LibraryBooksTable,
  ) {}

  // The session is kept in AsyncStorage so a signed-in phone stays signed in.
  // Expo Go cannot receive sign-in links, so nothing is read from a URL.
  static open(url: string, publicKey: string): SupabaseConnection {
    const client = createClient(url, publicKey, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
    return new SupabaseConnection(client.auth, new SupabaseLibraryBooks(client));
  }

  // Supabase refreshes the sign-in token only while the app is on screen (React Native guidance).
  keepSessionFresh(appOnScreen: boolean): void {
    void (appOnScreen ? this.auth.startAutoRefresh() : this.auth.stopAutoRefresh());
  }
}
