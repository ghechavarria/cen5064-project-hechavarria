/**
 * Data: GoogleBooksIsbnLookup — the Google Books source (free API key).
 * Google often has the exact cover of a specific printing where Open Library
 * does not. Two parts:
 *   - the Books API search — only a volume that lists the scanned ISBN is
 *     accepted, so a different edition is never passed off as this one;
 *   - Google's cover-by-ISBN image, used when the search has no volume or no
 *     cover (Google covers many reprints there that the search doesn't list).
 */
import { BookFormat, Isbn } from "../domain";
import { IsbnNotFoundError } from "../domain/exceptions";
import { BookMetadata, IsbnLookup } from "../service/ports";
import { ContentTypeGetter, Http, Json, JsonGetter } from "./http";

type VolumeInfo = {
  title?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[];
  industryIdentifiers?: { type: string; identifier: string }[];
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
};

/** One Google Books volume and the rules that turn it into BookMetadata. */
class GoogleBooksVolume {
  constructor(
    private readonly isbn: string,
    private readonly info: VolumeInfo,
  ) {}

  get hasCover(): boolean {
    return this.coverUrl !== "";
  }

  // True only when this volume is the scanned edition (its ISBN-10 or ISBN-13 matches).
  get isEdition(): boolean {
    return (this.info.industryIdentifiers ?? []).some(
      (identifier) => Isbn.normalize(identifier.identifier) === this.isbn,
    );
  }

  // isbnCover: Google's cover-by-ISBN image, when the volume itself has none.
  toMetadata(isbnCover: string | null = null): BookMetadata {
    const covers = [this.coverUrl, isbnCover ?? ""].filter((url) => url !== "");
    return {
      isbn: this.isbn,
      title: this.info.title?.trim() ?? "",
      author: this.info.authors?.[0]?.trim() ?? "",
      publisher: this.info.publisher?.trim() ?? "",
      coverUrl: covers[0] ?? "",
      coverCandidates: covers,
      // Google does not record the binding.
      format: BookFormat.UNKNOWN,
      series: "",
      description: this.info.description?.trim() ?? "",
      published: this.info.publishedDate?.trim() ?? "",
      pageCount: this.info.pageCount ?? 0,
      subjects: (this.info.categories ?? []).slice(0, 8).join(", "),
    };
  }

  // Google serves http thumbnails with a page-curl effect; ask for https and a flat cover.
  private get coverUrl(): string {
    const link = this.info.imageLinks?.thumbnail ?? this.info.imageLinks?.smallThumbnail ?? "";
    return link.replace(/^http:/, "https:").replace(/&edge=curl/, "");
  }
}

export class GoogleBooksIsbnLookup implements IsbnLookup {
  constructor(
    private readonly apiKey: string,
    private readonly getJson: JsonGetter = Http.getJson,
    private readonly contentType: ContentTypeGetter = Http.contentType,
  ) {}

  async byIsbn(isbn: string): Promise<BookMetadata> {
    const key = Isbn.normalize(isbn);
    // If Google can't be reached at all this throws, and the other source answers alone.
    const volume = await this.findVolume(key);
    const isbnCover = volume?.hasCover ? null : await this.coverByIsbn(key);
    if (!volume && !isbnCover) {
      throw new IsbnNotFoundError(key);
    }
    // No volume but a cover: a cover-only answer, merged with the other source's details.
    return (volume ?? new GoogleBooksVolume(key, {})).toMetadata(isbnCover);
  }

  private async findVolume(isbn: string): Promise<GoogleBooksVolume | null> {
    const payload = await this.getJson(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}` +
        `&key=${encodeURIComponent(this.apiKey)}`,
    );
    return (
      ((payload.items as Json[] | undefined) ?? [])
        .map((item) => new GoogleBooksVolume(isbn, (item.volumeInfo ?? {}) as VolumeInfo))
        .find((candidate) => candidate.isEdition) ?? null
    );
  }

  // Google answers a real cover as JPEG and "image not available" as a small PNG.
  // A web browser can't read the answer (no CORS headers), so there the image is
  // offered unchecked and the owner judges it by eye.
  private async coverByIsbn(isbn: string): Promise<string | null> {
    const url = `https://books.google.com/books/content?vid=ISBN${isbn}&printsec=frontcover&img=1&zoom=1`;
    try {
      return (await this.contentType(url)).includes("jpeg") ? url : null;
    } catch {
      return url;
    }
  }
}
