/**
 * CompositionRoot: the one place that names concrete Data classes. It picks
 * storage for this platform, plugs it, the book sources and the account service
 * into the Service ports, and returns the use cases. Not a C4 container; only
 * App.tsx calls it, and the UI never receives a repository or other adapter.
 */
import { AppState, Platform } from "react-native";
import { JsonBookRepository, MemoryBookRepository } from "./data/bookRepository";
import { GoogleBooksIsbnLookup } from "./data/googleBooks";
import { CachingIsbnLookup, MergedIsbnLookup } from "./data/isbnLookup";
import { OpenLibraryIsbnLookup } from "./data/openLibrary";
import { SupabaseConnection } from "./data/supabase";
import { SupabaseAccounts, UnconfiguredAccounts } from "./data/supabaseAccounts";
import { SupabaseLibraryBackup, UnconfiguredLibraryBackup } from "./data/supabaseBackup";
import { AccountUseCases, UseCases } from "./service";
import { BookRepository, IsbnCache, IsbnLookup, SyncStore } from "./service/ports";

/** The device store: it keeps the library, caches lookups and serves sync; three separate ports. */
type LocalStore = BookRepository & IsbnCache & SyncStore;

/**
 * The shared MyHomeLib Supabase project, so a fresh clone can create an account
 * with no setup. Its publishable key is public by design: row level security
 * keeps each account to its own rows (ADR-012). Never put the secret or
 * service_role key here. EXPO_PUBLIC_SUPABASE_URL / _KEY in .env point the app
 * at another project instead.
 */
const SHARED_SUPABASE = {
  url: "https://abpyekzqvmjulnlpmowv.supabase.co",
  publicKey: "sb_publishable_h1dki90msp5JxM2qoNfRkA_wgLoFZAw",
};

/** Everything the app runs on: the library use cases, and the account use cases with sync. */
export type AppServices = { library: UseCases; account: AccountUseCases };

export class CompositionRoot {
  static async open(): Promise<AppServices> {
    const store = await CompositionRoot.openStore();
    // Decorators: the sources are merged, then cached in the device store.
    const lookup = new CachingIsbnLookup(new MergedIsbnLookup(CompositionRoot.bookSources()), store);
    return { library: new UseCases(store, lookup), account: CompositionRoot.accountUseCases(store) };
  }

  // Best source first. Google Books joins only when a key is configured
  // (EXPO_PUBLIC_GOOGLE_BOOKS_KEY in .env); Open Library always answers.
  private static bookSources(): IsbnLookup[] {
    const googleKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_KEY?.trim();
    const openLibrary = new OpenLibraryIsbnLookup();
    return googleKey ? [new GoogleBooksIsbnLookup(googleKey), openLibrary] : [openLibrary];
  }

  // Accounts use the project named in .env, or else the shared one (ADR-012).
  // If neither gives a URL and key, the Null Objects stand in: nobody can sign
  // in, and the app keeps the library on this device only.
  private static accountUseCases(store: LocalStore): AccountUseCases {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || SHARED_SUPABASE.url;
    const publicKey = process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() || SHARED_SUPABASE.publicKey;
    if (!url || !publicKey) {
      return new AccountUseCases(new UnconfiguredAccounts(), store, store, new UnconfiguredLibraryBackup());
    }
    const connection = SupabaseConnection.open(url, publicKey);
    if (Platform.OS !== "web") {
      AppState.addEventListener("change", (state) => connection.keepSessionFresh(state === "active"));
    }
    return new AccountUseCases(
      new SupabaseAccounts(connection.auth),
      store,
      store,
      new SupabaseLibraryBackup(connection.books),
    );
  }

  // Phones use SQLite (imported lazily so web bundles never load expo-sqlite).
  private static async openStore(): Promise<LocalStore> {
    if (Platform.OS === "web") {
      return CompositionRoot.browserStore();
    }
    try {
      return await (await import("./data/sqliteRepository")).SqliteBookRepository.open();
    } catch {
      return CompositionRoot.browserStore();
    }
  }

  // Browser localStorage when there is one; otherwise memory only.
  private static browserStore(): LocalStore {
    return typeof globalThis.localStorage !== "undefined"
      ? new JsonBookRepository(globalThis.localStorage)
      : new MemoryBookRepository();
  }
}
