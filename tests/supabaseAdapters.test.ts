/**
 * Tests: the Supabase adapters (ADR-012) against fakes of the few Supabase calls
 * they make, so no project, key or network is needed. SupabaseAccounts turns
 * Supabase answers into Accounts and plain-language AccountErrors;
 * SupabaseLibraryBackup round-trips versions through library_books, pages
 * large libraries, and reports any failure as SyncUnavailableError.
 */
import type { LibraryBooksTable, RemoteBookRow, SupabaseAuth, SupabaseError, SupabaseUser } from "../data/supabase";
import { SupabaseAccounts, UnconfiguredAccounts } from "../data/supabaseAccounts";
import { SupabaseLibraryBackup } from "../data/supabaseBackup";
import { Book, Gift, ReadingStatus, Shelf } from "../domain";
import { AccountError, BookVersion, SyncUnavailableError } from "../service/ports";
import { FOX } from "./fixtures";

const GRACE: SupabaseUser = { id: "user-1", email: "grace@example.com" };

/** Supabase Auth with one registered user. Set `failure` to answer every call with that error. */
class FakeAuth implements SupabaseAuth {
  session: { user: SupabaseUser } | null = null;
  confirmEmail = false;
  failure: SupabaseError | null = null;
  offline = false;
  password = "correct horse";
  readonly calls: string[] = [];
  private listeners: ((event: string, session: { user: SupabaseUser } | null) => void)[] = [];

  async getSession() {
    return this.answer("getSession", { session: this.session });
  }
  async signUp(credentials: { email: string; password: string }) {
    this.calls.push(`signUp ${credentials.email}`);
    const session = this.confirmEmail ? null : this.signInAs(GRACE);
    return this.answer("signUp", { user: GRACE, session });
  }
  async signInWithPassword(credentials: { email: string; password: string }) {
    if (credentials.password !== this.password) {
      return { data: { user: null }, error: { message: "Invalid login credentials", code: "invalid_credentials", status: 400 } };
    }
    return this.answer("signIn", { user: this.signInAs(GRACE).user });
  }
  async signOut() {
    this.calls.push("signOut");
    this.session = null;
    this.emit();
    return { error: this.failure };
  }
  onAuthStateChange(callback: (event: string, session: { user: SupabaseUser } | null) => void) {
    this.listeners.push(callback);
    return { data: { subscription: { unsubscribe: () => (this.listeners = this.listeners.filter((l) => l !== callback)) } } };
  }

  private signInAs(user: SupabaseUser) {
    this.session = { user };
    this.emit();
    return this.session;
  }
  private emit() {
    this.listeners.forEach((listener) => listener("CHANGE", this.session));
  }
  private answer<T>(call: string, data: T) {
    if (this.offline) {
      throw new TypeError("Network request failed");
    }
    this.calls.push(call);
    return { data, error: this.failure };
  }
}

describe("SupabaseAccounts", () => {
  test("signs up, stays signed in, and signs out", async () => {
    const auth = new FakeAuth();
    const accounts = new SupabaseAccounts(auth);
    expect(accounts.configured).toBe(true);
    expect(await accounts.current()).toBeNull();
    expect(await accounts.signUp("grace@example.com", "correct horse")).toEqual({ id: "user-1", email: "grace@example.com" });
    expect(await accounts.current()).toEqual({ id: "user-1", email: "grace@example.com" });
    await accounts.signOut();
    expect(await accounts.current()).toBeNull();
  });

  test("with email confirmation on, sign-up returns no account until the email is confirmed", async () => {
    const auth = new FakeAuth();
    auth.confirmEmail = true;
    expect(await new SupabaseAccounts(auth).signUp("grace@example.com", "correct horse")).toBeNull();
  });

  test("a wrong password is explained in plain words", async () => {
    const accounts = new SupabaseAccounts(new FakeAuth());
    await expect(accounts.signIn("grace@example.com", "wrong")).rejects.toThrow(
      new AccountError("That email and password don't match an account."),
    );
  });

  test("being offline, or an error the app doesn't know, still gives a sentence to show", async () => {
    const auth = new FakeAuth();
    const accounts = new SupabaseAccounts(auth);
    auth.offline = true;
    await expect(accounts.signUp("grace@example.com", "correct horse")).rejects.toThrow(
      new AccountError("Couldn't reach the account service. Check your connection and try again."),
    );
    expect(await accounts.current()).toBeNull();
    auth.offline = false;
    auth.failure = { message: "Database error saving new user", status: 500 };
    await expect(accounts.signUp("grace@example.com", "correct horse")).rejects.toThrow(
      new AccountError("Something went wrong with your account. Try again."),
    );
  });

  test("listeners hear sign-in and sign-out until they unsubscribe", async () => {
    const auth = new FakeAuth();
    const accounts = new SupabaseAccounts(auth);
    const heard: (string | null)[] = [];
    const stop = accounts.onChange((account) => heard.push(account?.id ?? null));
    await accounts.signIn("grace@example.com", "correct horse");
    await accounts.signOut();
    stop();
    await accounts.signIn("grace@example.com", "correct horse");
    expect(heard).toEqual(["user-1", null]);
  });
});

describe("UnconfiguredAccounts (Null Object)", () => {
  test("nobody is signed in, and account actions explain that accounts aren't set up", async () => {
    const accounts = new UnconfiguredAccounts();
    expect(accounts.configured).toBe(false);
    expect(await accounts.current()).toBeNull();
    await expect(accounts.signIn()).rejects.toThrow(new AccountError("Accounts aren't set up in this copy of the app."));
    await expect(accounts.signOut()).resolves.toBeUndefined();
    accounts.onChange()();
  });
});

/** library_books in memory: primary key (owner_id, isbn), ISBN-ordered pages. */
class FakeTable implements LibraryBooksTable {
  rows: RemoteBookRow[] = [];
  failure: SupabaseError | null = null;
  offline = false;
  readonly requests: string[] = [];

  async page(ownerId: string, from: number, to: number) {
    this.reach(`page ${from}-${to}`);
    const mine = this.rows.filter((row) => row.owner_id === ownerId).sort((a, b) => a.isbn.localeCompare(b.isbn));
    return { data: this.failure ? null : mine.slice(from, to + 1), error: this.failure };
  }

  async upsert(rows: RemoteBookRow[]) {
    this.reach(`upsert ${rows.length}`);
    for (const row of rows) {
      this.rows = [...this.rows.filter((kept) => kept.owner_id !== row.owner_id || kept.isbn !== row.isbn), row];
    }
    return { error: this.failure };
  }

  private reach(request: string) {
    if (this.offline) {
      throw new TypeError("Network request failed");
    }
    this.requests.push(request);
  }
}

const giftVersion = (updatedAt: number, deletedAt: number | null = null): BookVersion => ({
  book: new Book({ ...FOX, shelf: Shelf.OWNED, acquisition: new Gift("Grandma"), readingStatus: ReadingStatus.READ }),
  updatedAt,
  deletedAt,
});

describe("SupabaseLibraryBackup", () => {
  test("pushed versions come back whole, timestamps and tombstones included", async () => {
    const table = new FakeTable();
    const backup = new SupabaseLibraryBackup(table);
    await backup.push("user-1", [giftVersion(1000)]);
    expect(table.rows[0]).toMatchObject({ owner_id: "user-1", acquired_as: "GIFTED", gifted_by: "Grandma", updated_at: 1000, deleted_at: null });

    const [version] = await backup.pull("user-1");
    expect(version).toMatchObject({ updatedAt: 1000, deletedAt: null });
    expect(version.book).toMatchObject({ isbn: FOX.isbn, giftedBy: "Grandma", readingStatus: ReadingStatus.READ, pageCount: FOX.pageCount });

    await backup.push("user-1", [giftVersion(2000, 2000)]);
    expect(await backup.pull("user-1")).toMatchObject([{ updatedAt: 2000, deletedAt: 2000 }]);
    expect(await backup.pull("user-2")).toEqual([]);
  });

  test("a large library is read and written in pages", async () => {
    const table = new FakeTable();
    const backup = new SupabaseLibraryBackup(table);
    const versions = Array.from({ length: 1200 }, (_, n) => ({
      ...giftVersion(n),
      book: new Book({ ...FOX, isbn: `isbn-${String(n).padStart(4, "0")}`, shelf: Shelf.WANTED }),
    }));
    await backup.push("user-1", versions);
    expect(table.requests).toEqual(["upsert 500", "upsert 500", "upsert 200"]);
    expect(await backup.pull("user-1")).toHaveLength(1200);
    expect(table.requests.slice(3)).toEqual(["page 0-499", "page 500-999", "page 1000-1499"]);
  });

  test("a damaged remote row gets safe defaults; a row without an ISBN is skipped", async () => {
    const table = new FakeTable();
    await new SupabaseLibraryBackup(table).push("user-1", [giftVersion(5)]);
    table.rows.push({ ...table.rows[0], isbn: "" }, { ...table.rows[0], isbn: "9780141346809", shelf: "ATTIC", copy_count: -2 });
    const versions = await new SupabaseLibraryBackup(table).pull("user-1");
    expect(versions.map((version) => [version.book.isbn, version.book.shelf, version.book.copyCount])).toEqual([
      [FOX.isbn, Shelf.OWNED, 1],
      ["9780141346809", Shelf.WANTED, 1],
    ]);
  });

  test("offline or refused by the server: SyncUnavailableError, which the app shows as 'will sync later'", async () => {
    const table = new FakeTable();
    const backup = new SupabaseLibraryBackup(table);
    table.offline = true;
    await expect(backup.pull("user-1")).rejects.toBeInstanceOf(SyncUnavailableError);
    await expect(backup.push("user-1", [giftVersion(1)])).rejects.toBeInstanceOf(SyncUnavailableError);
    table.offline = false;
    table.failure = { message: "new row violates row-level security policy", code: "42501" };
    await expect(backup.push("user-1", [giftVersion(1)])).rejects.toThrow(
      "Couldn't sync your library right now. It's saved on this phone and will sync later.",
    );
  });
});
