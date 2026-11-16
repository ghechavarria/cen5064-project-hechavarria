/**
 * Presentation model: LibraryInsights — the Account tab's highlights, worked
 * out from the library view: pages read on the owned shelf, the top genres,
 * the gifts and who gave the most, and the latest book added.
 *
 * Genres come from the books' subjects, which the two sources write in their
 * own styles ("Fiction / Fantasy / General", "Literature and fiction (general)").
 * Each subject is cut down to its most telling part, and catalog bookkeeping
 * ("Accessible book", "nyt:…") is skipped; a book counts once per genre.
 */
import { Acquisition, Book, ReadingStatus } from "../../domain";
import { Labels } from "./labels";
import { LibraryView } from "./libraryController";

export type Insights = {
  pages: { read: number; total: number };
  genres: string[];
  gifts: { count: number; topGiver: string | null };
  latest: Book | null;
};

const TOP_GENRES = 3;
// Catalog bookkeeping, not genres.
const NOT_A_GENRE = /:|^(accessible book|protected daisy|in library|large type|lending library|open library|internet archive|overdrive|fiction|juvenile fiction|general)$/i;

export class LibraryInsights {
  static of(view: LibraryView): Insights {
    return {
      pages: LibraryInsights.pages(view.owned),
      genres: LibraryInsights.topGenres(view.all),
      gifts: LibraryInsights.gifts(view.owned),
      latest: LibraryInsights.latest(view.all),
    };
  }

  // Pages on the owned shelf, and how many of them are in books marked read.
  private static pages(owned: Book[]): Insights["pages"] {
    const total = owned.reduce((sum, book) => sum + book.pageCount, 0);
    const read = owned
      .filter((book) => book.readingStatus === ReadingStatus.READ)
      .reduce((sum, book) => sum + book.pageCount, 0);
    return { read, total };
  }

  private static topGenres(books: Book[]): string[] {
    const counts = new Map<string, { name: string; books: number }>();
    for (const book of books) {
      for (const name of new Set(LibraryInsights.genresOf(book.subjects))) {
        const key = name.toLowerCase();
        const entry = counts.get(key) ?? { name, books: 0 };
        entry.books += 1;
        counts.set(key, entry);
      }
    }
    return [...counts.values()]
      .sort((a, b) => b.books - a.books || a.name.localeCompare(b.name))
      .slice(0, TOP_GENRES)
      .map((entry) => entry.name);
  }

  // "Fiction / Fantasy / General, Romance" → ["Fantasy", "Romance"].
  private static genresOf(subjects: string): string[] {
    return Labels.subjectList(subjects)
      .map((subject) => {
        const parts = subject
          .split("/")
          .map((part) => part.replace(/\(general\)/i, "").trim())
          .filter((part) => part !== "" && !/^general$/i.test(part));
        return parts.length > 1 ? parts[1] : (parts[0] ?? "");
      })
      .filter((name) => name !== "" && !NOT_A_GENRE.test(name))
      .map((name) => name.charAt(0).toUpperCase() + name.slice(1));
  }

  // Owned books that were gifts, and the giver of the most of them.
  private static gifts(owned: Book[]): Insights["gifts"] {
    const gifts = owned.filter((book) => book.acquiredAs === Acquisition.GIFTED);
    const byGiver = new Map<string, { name: string; gifts: number }>();
    for (const book of gifts) {
      const name = book.giftedBy?.trim();
      if (name) {
        const entry = byGiver.get(name.toLowerCase()) ?? { name, gifts: 0 };
        entry.gifts += 1;
        byGiver.set(name.toLowerCase(), entry);
      }
    }
    const top = [...byGiver.values()].sort((a, b) => b.gifts - a.gifts || a.name.localeCompare(b.name))[0];
    return { count: gifts.length, topGiver: top?.name ?? null };
  }

  // The book with the newest added date (either shelf).
  private static latest(books: Book[]): Book | null {
    return books.reduce<Book | null>(
      (newest, book) => (newest === null || (book.addedAt ?? 0) > (newest.addedAt ?? 0) ? book : newest),
      null,
    );
  }
}
