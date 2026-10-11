/**
 * Data: decorators that combine IsbnLookup sources (polymorphism through one interface).
 *   - MergedIsbnLookup  — asks several sources at once and merges their answers
 *   - CachingIsbnLookup — checks the local cache before the inner lookup
 * The sources themselves are OpenLibraryIsbnLookup and GoogleBooksIsbnLookup;
 * tests add FakeIsbnLookup in tests/fixtures.ts.
 */
import { BookFormat, Isbn } from "../domain";
import { DomainError, IsbnNotFoundError } from "../domain/exceptions";
import { BookMetadata, IsbnCache, IsbnLookup } from "../service/ports";

/**
 * Decorator: asks every source in parallel and merges what they find, field by
 * field. Sources are listed best-first: for each field the first source that
 * knows it wins. Covers are not merged away — every distinct cover is kept as
 * a candidate so the owner can pick the one that matches their copy.
 * One source failing (offline, no key, quota) is fine as long as another answers.
 */
export class MergedIsbnLookup implements IsbnLookup {
  constructor(private readonly sources: IsbnLookup[]) {}

  async byIsbn(isbn: string): Promise<BookMetadata> {
    const results = await Promise.allSettled(this.sources.map((source) => source.byIsbn(isbn)));
    const found = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    if (found.length === 0) {
      // Prefer a domain answer ("no record for this ISBN") over a network error.
      const reasons = results.map((result) => (result as PromiseRejectedResult).reason);
      throw reasons.find((reason) => reason instanceof DomainError) ?? reasons[0];
    }
    // A source that only found a cover can't identify a book by itself.
    if (!found.some((metadata) => metadata.title.trim() !== "")) {
      throw new IsbnNotFoundError(Isbn.normalize(isbn));
    }
    return MergedIsbnLookup.merge(found);
  }


  private static merge(found: BookMetadata[]): BookMetadata {
    // Sources leave a field empty when they don't know it; the merge supplies the fallbacks.
    const firstText = (pick: (metadata: BookMetadata) => string, fallback = "") =>
      found.map(pick).find((value) => value.trim() !== "") ?? fallback;
    const covers = [...new Set(found.flatMap((metadata) => metadata.coverCandidates))];
    return {
      isbn: found[0].isbn,
      title: firstText((metadata) => metadata.title, "Untitled"),
      author: firstText((metadata) => metadata.author, "Unknown"),
      publisher: firstText((metadata) => metadata.publisher),
      coverUrl: covers[0] ?? "",
      coverCandidates: covers,
      format:
        found.map((metadata) => metadata.format).find((format) => format !== BookFormat.UNKNOWN) ??
        BookFormat.UNKNOWN,
      series: firstText((metadata) => metadata.series),
      description: firstText((metadata) => metadata.description),
      published: firstText((metadata) => metadata.published),
      pageCount: found.map((metadata) => metadata.pageCount).find((count) => count > 0) ?? 0,
      subjects: firstText((metadata) => metadata.subjects),
    };
  }
}

/**
 * Decorator: wraps any IsbnLookup and caches its answers in IsbnCache
 * (the repository), so a rescan works offline and skips the network.
 */
export class CachingIsbnLookup implements IsbnLookup {
  constructor(
    private readonly inner: IsbnLookup,
    private readonly cache: IsbnCache,
  ) {}

  async byIsbn(isbn: string): Promise<BookMetadata> {
    const key = Isbn.normalize(isbn);
    const cached = await this.cache.cachedIsbn(key);
    if (cached) {
      return cached;
    }
    const metadata = await this.inner.byIsbn(key);
    await this.cache.cacheIsbn(metadata);
    return metadata;
  }
}
