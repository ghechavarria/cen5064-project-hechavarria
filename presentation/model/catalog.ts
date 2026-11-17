/**
 * Presentation model: the Owned catalog's groupings (Strategy pattern).
 * CatalogGrouping is the abstract strategy; each subclass decides which
 * section a book belongs in. Catalog is the registry the screen uses.
 */
import { Acquisition, Book } from "../../domain";

export type CatalogMode = "az" | "author" | "series" | "gifts";

/** A section of the list: its heading, its books, and the A–Z rail letter it is filed under. */
export type CatalogSection = { title: string; data: Book[]; letter: string };

/** Abstract strategy: each subclass says which section a book belongs to. */
export abstract class CatalogGrouping {
  abstract readonly mode: CatalogMode;
  abstract readonly label: string;
  // Shown when the shelf has books but none belong in this grouping (only Gifted narrows).
  readonly empty = { title: "Nothing here yet", message: "No book on this shelf fits this grouping." };

  protected abstract sectionOf(book: Book): string;

  // The rail letter a section is filed under: the first letter of its heading,
  // unless a subclass knows better.
  protected letterFor(title: string, _first: Book): string {
    return Catalog.letterOf(title);
  }

  // Which books this grouping lists; every one, unless a subclass narrows it.
  protected includes(_book: Book): boolean {
    return true;
  }

  // Template method: keep the included books, sort by title, bucket by sectionOf, then order the sections.
  sections(books: Book[]): CatalogSection[] {
    const groups = new Map<string, Book[]>();
    books
      .filter((book) => this.includes(book))
      .sort((a, b) => a.title.localeCompare(b.title))
      .forEach((book) => {
        const key = this.sectionOf(book);
        groups.set(key, [...(groups.get(key) ?? []), book]);
      });
    return this.order([...groups.keys()]).map((title) => {
      const data = groups.get(title) ?? [];
      return { title, data, letter: this.letterFor(title, data[0]) };
    });
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

/** Only the gifts, under the person who gave them. */
class GiftGrouping extends CatalogGrouping {
  readonly mode = "gifts";
  readonly label = "Gifted";
  override readonly empty = { title: "No gifts yet", message: "Books marked as gifts show here, under who gave them." };

  protected override includes(book: Book): boolean {
    return book.acquiredAs === Acquisition.GIFTED;
  }

  protected sectionOf(book: Book): string {
    return `From ${book.giftedBy?.trim() || "someone"}`;
  }

  // Every heading starts "From …": the rail files each giver under their own name.
  protected override letterFor(_title: string, first: Book): string {
    return Catalog.letterOf(first.giftedBy ?? "");
  }
}

/** Registry of the groupings, plus the A–Z letters they share with the rail. */
export class Catalog {
  static readonly LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

  static readonly groupings: readonly CatalogGrouping[] = [
    new TitleLetterGrouping(),
    new AuthorGrouping(),
    new SeriesGrouping(),
    new GiftGrouping(),
  ];

  // First letter of a title; digits and symbols file under "#".
  static letterOf(title: string): string {
    const first = title.trim().charAt(0).toUpperCase();
    return first >= "A" && first <= "Z" ? first : "#";
  }

  static sections(books: Book[], mode: CatalogMode): CatalogSection[] {
    return Catalog.grouping(mode).sections(books);
  }

  static grouping(mode: CatalogMode): CatalogGrouping {
    return Catalog.groupings.find((candidate) => candidate.mode === mode) ?? Catalog.groupings[0];
  }
}
