/**
 * Data: OpenLibraryIsbnLookup — the Open Library book source (free, no key).
 * Edition-first: the record for this exact ISBN supplies the cover, publisher,
 * date, pages and binding; the search result (which merges every edition of the
 * work) and the work record only fill gaps.
 */
import { BookFormat, Isbn } from "../domain";
import { IsbnNotFoundError } from "../domain/exceptions";
import { BookMetadata, IsbnLookup } from "../service/ports";
import { Http, Json, JsonGetter } from "./http";

/**
 * Open Library field cleanup, bundled in one class. Its JSON is loose: a field
 * may be a string, an array, or {value} / {name}, and series names carry
 * volume numbers. Every rule for turning that into plain values lives here.
 */
class OpenLibraryText {
  // First usable string inside a string / array / {value} / {name}.
  static text(value: unknown): string {
    if (typeof value === "string") {
      return value.trim();
    }
    if (Array.isArray(value) && value.length > 0) {
      return OpenLibraryText.text(value[0]);
    }
    if (value && typeof value === "object" && "value" in value) {
      return OpenLibraryText.text((value as { value: unknown }).value);
    }
    if (value && typeof value === "object" && "name" in value) {
      return OpenLibraryText.text((value as { name: unknown }).name);
    }
    return "";
  }

  // Up to eight subjects, comma-separated.
  static subjects(value: unknown): string {
    if (!Array.isArray(value)) {
      return OpenLibraryText.text(value);
    }
    return value
      .map((entry) => OpenLibraryText.text(entry))
      .filter((entry) => entry.length > 0)
      .slice(0, 8)
      .join(", ");
  }

  // A description, ignoring "Source title: …" placeholders.
  static plot(value: unknown): string {
    const text = OpenLibraryText.text(value);
    return /^source title:/i.test(text) ? "" : text;
  }

  // "Series: Harry_Potter (Book 3)" → "Harry Potter".
  static series(raw: string): string {
    return raw
      .replace(/^series?:\s*/i, "")
      .replace(/_/g, " ")
      .replace(/\s*\((?:book\s*)?#?\d+\)\s*$/i, "")
      .replace(/\s+(?:book\s*)?#?\d+\s*$/i, "")
      .replace(/\s*,\s*#?\d+\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Some records only name the series as a "Series: …" subject.
  static seriesFromSubjects(value: unknown): string {
    const subjects = Array.isArray(value)
      ? value.map((entry) => OpenLibraryText.text(entry))
      : [OpenLibraryText.text(value)];
    return OpenLibraryText.series(subjects.find((entry) => /^series?:/i.test(entry)) ?? "");
  }

  // "Hardcover", "Library Binding", "Mass Market Paperback", "Trade paperback", …
  static format(value: unknown): BookFormat {
    const text = OpenLibraryText.text(value).toLowerCase();
    if (/hard|library binding|board/.test(text)) {
      return BookFormat.HARDCOVER;
    }
    if (/paper|soft/.test(text)) {
      return BookFormat.PAPERBACK;
    }
    return BookFormat.UNKNOWN;
  }

  // Open Library cover ids; -1 marks a deleted cover.
  static coverUrls(value: unknown): string[] {
    return (Array.isArray(value) ? value : [value])
      .map(Number)
      .filter((id) => id > 0)
      .map((id) => `https://covers.openlibrary.org/b/id/${id}-M.jpg`);
  }
}

/**
 * One ISBN's Open Library payloads (edition, search doc, optional work) bundled
 * with the rules that turn them into BookMetadata. Edition fields win.
 */
class OpenLibraryRecord {
  constructor(
    private readonly isbn: string,
    private readonly edition: Json,
    private readonly search: Json,
    private readonly work: Json = {},
  ) {}

  get found(): boolean {
    return Boolean(OpenLibraryText.text(this.edition.title) || OpenLibraryText.text(this.search.title));
  }

  get workKey(): string {
    const editionWorks = this.edition.works;
    return (
      [
        OpenLibraryText.text(Array.isArray(editionWorks) ? (editionWorks[0] as { key?: string } | undefined)?.key : ""),
        OpenLibraryText.text(this.search.key),
      ].find((key) => key.startsWith("/works/")) ?? ""
    );
  }

  // The work record is only fetched when the edition lacks a series or a plot.
  get needsWork(): boolean {
    return Boolean(this.workKey) && (!this.editionSeries || !this.editionPlot);
  }

  withWork(work: Json): OpenLibraryRecord {
    return new OpenLibraryRecord(this.isbn, this.edition, this.search, work);
  }

  toMetadata(): BookMetadata {
    const covers = this.coverCandidates;
    return {
      isbn: this.isbn,
      title: OpenLibraryText.text(this.edition.title) || OpenLibraryText.text(this.search.title),
      author: OpenLibraryText.text(this.search.author_name),
      publisher:
        OpenLibraryText.text(this.edition.publishers) || OpenLibraryText.text(this.search.publisher),
      coverUrl: covers[0] ?? "",
      coverCandidates: covers,
      format: OpenLibraryText.format(this.edition.physical_format),
      series:
        this.editionSeries ||
        OpenLibraryText.series(OpenLibraryText.text(this.work.series)) ||
        OpenLibraryText.seriesFromSubjects(this.edition.subjects) ||
        OpenLibraryText.seriesFromSubjects(this.work.subjects) ||
        OpenLibraryText.seriesFromSubjects(this.search.subject),
      description: this.editionPlot || OpenLibraryText.plot(this.work.description),
      published:
        OpenLibraryText.text(this.edition.publish_date) ||
        (this.search.first_publish_year ? String(this.search.first_publish_year) : ""),
      pageCount:
        Number(this.edition.number_of_pages) || Number(this.search.number_of_pages_median) || 0,
      subjects:
        OpenLibraryText.subjects(this.edition.subjects) ||
        OpenLibraryText.subjects(this.work.subjects) ||
        OpenLibraryText.subjects(this.search.subject),
    };
  }

  // This edition's own covers; the work's cover (possibly another edition's) only as a fallback.
  private get coverCandidates(): string[] {
    const editionCovers = OpenLibraryText.coverUrls(this.edition.covers);
    return editionCovers.length > 0 ? editionCovers : OpenLibraryText.coverUrls(this.search.cover_i);
  }

  private get editionSeries(): string {
    return OpenLibraryText.series(OpenLibraryText.text(this.edition.series));
  }

  private get editionPlot(): string {
    return OpenLibraryText.plot(this.edition.description) || OpenLibraryText.plot(this.search.first_sentence);
  }
}

/**
 * Open Library client: the edition record and search.json together, then the
 * work record only when series or plot is still missing. No API key.
 * getJson is injectable so tests can feed canned JSON.
 */
export class OpenLibraryIsbnLookup implements IsbnLookup {
  constructor(private readonly getJson: JsonGetter = Http.getJson) {}

  async byIsbn(isbn: string): Promise<BookMetadata> {
    const key = Isbn.normalize(isbn);
    const [edition, search] = await Promise.allSettled([
      this.getJson(`https://openlibrary.org/isbn/${encodeURIComponent(key)}.json`),
      this.getJson(`https://openlibrary.org/search.json?isbn=${encodeURIComponent(key)}`),
    ]);
    // Both requests failing means Open Library is unreachable, not that the ISBN is unknown.
    if (edition.status === "rejected" && search.status === "rejected") {
      throw search.reason;
    }
    const docs = search.status === "fulfilled" ? ((search.value.docs as Json[] | undefined) ?? []) : [];
    const record = new OpenLibraryRecord(
      key,
      edition.status === "fulfilled" ? edition.value : {},
      docs[0] ?? {},
    );
    if (!record.found) {
      throw new IsbnNotFoundError(key);
    }
    if (!record.needsWork) {
      return record.toMetadata();
    }
    return record
      .withWork(await this.optionalJson(`https://openlibrary.org${record.workKey}.json`))
      .toMetadata();
  }

  // The work record is an extra: a failed fetch reads as an empty record.
  private async optionalJson(url: string): Promise<Json> {
    try {
      return await this.getJson(url);
    } catch {
      return {};
    }
  }
}
