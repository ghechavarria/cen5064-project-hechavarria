/**
 * Data: OpenLibraryIsbnLookup and FakeIsbnLookup implement the IsbnLookup port.
 * Outbound HTTP lives here only.
 */
import { IsbnNotFoundError } from "../domain/exceptions";
import { normalizeIsbn } from "../domain";
import { BookMetadata, IsbnLookup } from "../service/ports";

export class FakeIsbnLookup implements IsbnLookup {
  constructor(private readonly catalog: Record<string, BookMetadata> = {}) {}

  async byIsbn(isbn: string): Promise<BookMetadata> {
    const key = normalizeIsbn(isbn);
    const metadata = this.catalog[key];
    if (!metadata) {
      throw new IsbnNotFoundError(key);
    }
    return metadata;
  }
}

export class CachingIsbnLookup implements IsbnLookup {
  constructor(
    private readonly inner: IsbnLookup,
    private readonly cache: {
      cachedIsbn(isbn: string): Promise<BookMetadata | null>;
      cacheIsbn(metadata: BookMetadata): Promise<void>;
    },
  ) {}

  async byIsbn(isbn: string): Promise<BookMetadata> {
    const key = normalizeIsbn(isbn);
    const cached = await this.cache.cachedIsbn(key);
    if (cached) {
      return cached;
    }
    const metadata = await this.inner.byIsbn(key);
    await this.cache.cacheIsbn(metadata);
    return metadata;
  }
}

function textOf(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value) && value.length > 0) {
    return textOf(value[0]);
  }
  if (value && typeof value === "object" && "value" in value) {
    return textOf((value as { value: unknown }).value);
  }
  if (value && typeof value === "object" && "name" in value) {
    return textOf((value as { name: unknown }).name);
  }
  return "";
}

function subjectList(value: unknown): string {
  if (!Array.isArray(value)) {
    return textOf(value);
  }
  return value
    .map((entry) => textOf(entry))
    .filter((entry) => entry.length > 0)
    .slice(0, 8)
    .join(", ");
}

function plotText(value: unknown): string {
  return /^source title:/i.test(textOf(value)) ? "" : textOf(value);
}

function normalizeSeries(raw: string): string {
  return raw
    .replace(/^series?:\s*/i, "")
    .replace(/_/g, " ")
    .replace(/\s*\((?:book\s*)?#?\d+\)\s*$/i, "")
    .replace(/\s+(?:book\s*)?#?\d+\s*$/i, "")
    .replace(/\s*,\s*#?\d+\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function seriesFromSubjects(value: unknown): string {
  return normalizeSeries(
    (Array.isArray(value) ? value.map((entry) => textOf(entry)) : [textOf(value)]).find((entry) =>
      /^series?:/i.test(entry),
    ) ?? "",
  );
}

function workKeyOf(edition: Record<string, unknown>, record: Record<string, unknown>): string {
  return [
    textOf(
      Array.isArray(edition.works) ? (edition.works[0] as { key?: string } | undefined)?.key : "",
    ),
    textOf(record.key),
  ].find((key) => key.startsWith("/works/")) ?? "";
}

export class OpenLibraryIsbnLookup implements IsbnLookup {
  constructor(
    private readonly getJson: (
      url: string,
    ) => Promise<Record<string, unknown>> = defaultGetJson,
  ) {}

  async byIsbn(isbn: string): Promise<BookMetadata> {
    const key = normalizeIsbn(isbn);
    const payload = await this.getJson(
      `https://openlibrary.org/search.json?isbn=${encodeURIComponent(key)}`,
    );
    const docs = (payload.docs as Record<string, unknown>[] | undefined) ?? [];
    if (docs.length === 0) {
      throw new IsbnNotFoundError(key);
    }
    const record = docs[0];
    const authors = (record.author_name as string[] | undefined) ?? [];
    const publishers = (record.publisher as string[] | undefined) ?? [];
    const coverId = record.cover_i as number | undefined;
    let edition: Record<string, unknown> = {};
    try {
      edition = await this.getJson(`https://openlibrary.org/isbn/${encodeURIComponent(key)}.json`);
    } catch {
      edition = {};
    }
    let work: Record<string, unknown> = {};
    if (
      workKeyOf(edition, record) &&
      (!normalizeSeries(textOf(edition.series)) ||
        !(plotText(edition.description) || plotText(record.first_sentence)))
    ) {
      try {
        work = await this.getJson(`https://openlibrary.org${workKeyOf(edition, record)}.json`);
      } catch {
        work = {};
      }
    }
    return {
      isbn: key,
      title: (record.title as string | undefined) ?? "Untitled",
      author: authors[0] ?? "Unknown",
      coverUrl: coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
        : `https://covers.openlibrary.org/b/isbn/${key}-M.jpg`,
      publisher: publishers[0] ?? textOf(edition.publishers) ?? "",
      series:
        normalizeSeries(textOf(edition.series)) ||
        normalizeSeries(textOf(work.series)) ||
        seriesFromSubjects(edition.subjects) ||
        seriesFromSubjects(work.subjects) ||
        seriesFromSubjects(record.subject),
      description:
        plotText(edition.description) ||
        plotText(record.first_sentence) ||
        plotText(work.description),
      published:
        textOf(edition.publish_date) ||
        (record.first_publish_year ? String(record.first_publish_year) : ""),
      pageCount:
        Number(edition.number_of_pages) ||
        Number(record.number_of_pages_median) ||
        0,
      subjects: subjectList(edition.subjects) || subjectList(work.subjects) || subjectList(record.subject),
    };
  }
}

async function defaultGetJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    headers: { "User-Agent": "MyHomeLib/1.0 (CEN 5064 student project)" },
  });
  if (!response.ok) {
    throw new IsbnNotFoundError(url);
  }
  return response.json() as Promise<Record<string, unknown>>;
}
