/**
 * Composition root: wires Data adapters to Service ports.
 * Not a C4 container. Presentation imports this file, not data/*.
 */
import { Platform } from "react-native";
import { CachingIsbnLookup, OpenLibraryIsbnLookup } from "./data/isbnLookup";
import { JsonBookRepository, MemoryBookRepository } from "./data/bookRepository";
import { BookRepository, IsbnLookup } from "./service/ports";

function webOrTestRepository(): BookRepository {
  return typeof globalThis.localStorage !== "undefined"
    ? new JsonBookRepository(globalThis.localStorage)
    : new MemoryBookRepository();
}

export async function openRepository(): Promise<BookRepository> {
  if (Platform.OS === "web") {
    return webOrTestRepository();
  }
  try {
    return await (await import("./data/sqliteRepository")).SqliteBookRepository.open();
  } catch {
    return webOrTestRepository();
  }
}

export function createIsbnLookup(repository: BookRepository): IsbnLookup {
  return new CachingIsbnLookup(new OpenLibraryIsbnLookup(), repository);
}
