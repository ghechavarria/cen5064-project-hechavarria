/**
 * Service: IsbnLookup and BookRepository ports.
 * Must not import React, SQLite, or fetch.
 */
export type BookMetadata = {
  isbn: string;
  title: string;
  author: string;
  coverUrl: string;
  publisher: string;
  series: string;
  description: string;
  published: string;
  pageCount: number;
  subjects: string;
};

export interface IsbnLookup {
  byIsbn(isbn: string): Promise<BookMetadata>;
}

export interface BookRepository {
  loadLibrary(ownerId: string): Promise<import("../domain").PersonalLibrary>;
  save(
    ownerId: string,
    book: import("../domain").Book,
  ): Promise<import("../domain").Book>;
  delete(ownerId: string, isbn: string): Promise<void>;
  cachedIsbn(isbn: string): Promise<BookMetadata | null>;
  cacheIsbn(metadata: BookMetadata): Promise<void>;
}
