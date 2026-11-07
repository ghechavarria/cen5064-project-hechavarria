/**
 * CompositionRoot: the one place that names concrete Data classes. It picks
 * storage for this platform, plugs it and the book sources into the Service
 * ports, and returns UseCases. Not a C4 container; only App.tsx calls it, and
 * the UI never receives a repository or lookup adapter.
 */
import { Platform } from "react-native";
import { JsonBookRepository, MemoryBookRepository } from "./data/bookRepository";
import { GoogleBooksIsbnLookup } from "./data/googleBooks";
import { CachingIsbnLookup, MergedIsbnLookup } from "./data/isbnLookup";
import { OpenLibraryIsbnLookup } from "./data/openLibrary";
import { UseCases } from "./service";
import { BookRepository, IsbnCache, IsbnLookup } from "./service/ports";

/** The device store: it keeps the library and caches lookups, two separate ports. */
type LocalStore = BookRepository & IsbnCache;

export class CompositionRoot {
  static async openUseCases(): Promise<UseCases> {
    const store = await CompositionRoot.openStore();
    // Decorators: the sources are merged, then cached in the device store.
    const lookup = new CachingIsbnLookup(new MergedIsbnLookup(CompositionRoot.bookSources()), store);
    return new UseCases(store, lookup);
  }

  // Best source first. Google Books joins only when a key is configured
  // (EXPO_PUBLIC_GOOGLE_BOOKS_KEY in .env); Open Library always answers.
  private static bookSources(): IsbnLookup[] {
    const googleKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_KEY?.trim();
    const openLibrary = new OpenLibraryIsbnLookup();
    return googleKey ? [new GoogleBooksIsbnLookup(googleKey), openLibrary] : [openLibrary];
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
