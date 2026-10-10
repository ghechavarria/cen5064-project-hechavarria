/**
 * Presentation model: Labels — every piece of display wording (shelves, bindings,
 * reading status, counts, a book's facts), so no component spells it out itself.
 */
import { Book, BookFormat, ReadingStatus, Shelf } from "../../domain";

export class Labels {
  static shelf(shelf: Shelf): string {
    return shelf === Shelf.OWNED ? "Owned" : "Wanted";
  }

  // Lower case for sentences: "Added Matilda to Owned (unread)."
  static reading(status: ReadingStatus): string {
    return status === ReadingStatus.READ ? "read" : "unread";
  }

  // Title case for buttons and tags: "Unread".
  static readingTitle(status: ReadingStatus): string {
    return status === ReadingStatus.READ ? "Read" : "Unread";
  }

  static format(format: BookFormat): string {
    return format === BookFormat.HARDCOVER ? "Hardcover" : format === BookFormat.PAPERBACK ? "Paperback" : "";
  }

  // The line under a book in a list: binding and copies ("Paperback · 2 copies"),
  // or the ISBN when the binding isn't known.
  static cardMeta(book: Book): string {
    return [Labels.format(book.format) || book.isbn, Labels.count(book.copyCount, "copy", "copies")].join(" · ");
  }

  // What a screen reader announces for a book card: "Matilda, by Roald Dahl, Paperback · 1 copy, read".
  static cardAccessibility(book: Book, meta?: string): string {
    const read = book.readingStatus === ReadingStatus.READ ? ", read" : "";
    return `${book.title}, by ${book.author}, ${meta ?? Labels.cardMeta(book)}${read}`;
  }

  // The detail screen's facts, skipping any the sources didn't supply.
  static facts(book: Book): { label: string; value: string }[] {
    return [
      { label: "Publisher", value: book.publisher },
      { label: "Published", value: book.published },
      { label: "Pages", value: book.pageCount ? String(book.pageCount) : "" },
      { label: "Series", value: book.series.trim() || "Standalone" },
      { label: "ISBN", value: book.isbn },
      { label: "Copies", value: String(book.copyCount) },
      { label: "Acquired", value: book.acquisition?.describe() ?? "" },
    ].filter((fact) => fact.value.trim() !== "");
  }

  // The description, unless it's missing or an old "Source title: …" placeholder.
  static about(book: Book): string {
    const description = book.description.trim();
    return description && !/^source title:/i.test(description)
      ? description
      : "No description for this edition.";
  }

  // count(1, "title") → "1 title"; count(2, "copy", "copies") → "2 copies".
  static count(count: number, singular: string, plural = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : plural}`;
  }
}
