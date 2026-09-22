/**
 * Presentation: group Owned books A–Z, by author, or by series.
 * Must not call fetch or SQL.
 */
import { Book } from "../domain";

export type CatalogMode = "az" | "author" | "series";

export type CatalogSection = { title: string; data: Book[] };

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

export function titleLetter(title: string): string {
  const ch = title.trim().charAt(0).toUpperCase();
  return ch >= "A" && ch <= "Z" ? ch : "#";
}

function sortByTitle(books: Book[]): Book[] {
  return [...books].sort((a, b) => a.title.localeCompare(b.title));
}

function sectionsFromMap(groups: Map<string, Book[]>): CatalogSection[] {
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([title, data]) => ({ title, data: sortByTitle(data) }));
}

export function catalogSections(books: Book[], mode: CatalogMode): CatalogSection[] {
  if (mode === "az") {
    const groups = new Map<string, Book[]>();
    LETTERS.forEach((letter) => groups.set(letter, []));
    sortByTitle(books).forEach((book) => {
      groups.get(titleLetter(book.title))?.push(book);
    });
    return [...groups.entries()]
      .filter(([, data]) => data.length > 0)
      .map(([title, data]) => ({ title, data }));
  }
  const groups = new Map<string, Book[]>();
  books.forEach((book) => {
    const key =
      mode === "author"
        ? book.author.trim() || "Unknown"
        : book.series.trim() || "Standalone";
    groups.set(key, [...(groups.get(key) ?? []), book]);
  });
  return sectionsFromMap(groups);
}
