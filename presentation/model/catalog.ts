/**
 * Presentation model: the Owned catalog's groupings (Strategy pattern).
 * CatalogGrouping is the abstract strategy; each subclass decides which
 * section a book belongs in. Catalog is the registry the screen uses.
 */
import { Book } from "../../domain";

export type CatalogMode = "az" | "author" | "series";

export type CatalogSection = { title: string; data: Book[] };

/** Abstract strategy: each subclass says which section a book belongs to. */
export abstract class CatalogGrouping {
  abstract readonly mode: CatalogMode;
  abstract readonly label: string;

  protected abstract sectionOf(book: Book): string;

  // Template method: sort by title, bucket by sectionOf, then order the sections.
  sections(books: Book[]): CatalogSection[] {
    const groups = new Map<string, Book[]>();
    [...books]
      .sort((a, b) => a.title.localeCompare(b.title))
      .forEach((book) => {
        const key = this.sectionOf(book);
        groups.set(key, [...(groups.get(key) ?? []), book]);
      });
    return this.order([...groups.keys()]).map((title) => ({ title, data: groups.get(title) ?? [] }));
  }

  // Default order is alphabetical; subclasses may override.
  protected order(titles: string[]): string[] {
    return titles.sort((a, b) => a.localeCompare(b));
  }
}

class TitleLetterGrouping extends CatalogGrouping {
  readonly mode = "az";
  readonly label = "A–Z";

  protected sectionOf(book: Book): string {
    return Catalog.letterOf(book.title);
  }

  // Rail order: A–Z, then # last.
  protected override order(titles: string[]): string[] {
    return Catalog.LETTERS.filter((letter) => titles.includes(letter));
  }
}

class AuthorGrouping extends CatalogGrouping {
  readonly mode = "author";
  readonly label = "Author";

  protected sectionOf(book: Book): string {
    return book.author.trim() || "Unknown";
  }
}

class SeriesGrouping extends CatalogGrouping {
  readonly mode = "series";
  readonly label = "Series";

  protected sectionOf(book: Book): string {
    return book.series.trim() || "Standalone";
  }
}

/** Registry of the groupings, plus the A–Z letters they share with the rail. */
export class Catalog {
  static readonly LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

  static readonly groupings: readonly CatalogGrouping[] = [
    new TitleLetterGrouping(),
    new AuthorGrouping(),
    new SeriesGrouping(),
  ];

  // First letter of a title; digits and symbols file under "#".
  static letterOf(title: string): string {
    const first = title.trim().charAt(0).toUpperCase();
    return first >= "A" && first <= "Z" ? first : "#";
  }

  static sections(books: Book[], mode: CatalogMode): CatalogSection[] {
    const grouping = Catalog.groupings.find((candidate) => candidate.mode === mode);
    return grouping ? grouping.sections(books) : [];
  }
}
