/**
 * Tests: the four core features in the README's "Scope for the final", each
 * driven end to end through LibraryController → use cases → domain → a real
 * repository, with the real lookup pipeline (Google Books + Open Library,
 * merged and cached) fed canned JSON instead of the network. The finer rules
 * are unit-tested per tier; this file shows each feature's main rule holds.
 */
import { MemoryBookRepository } from "../data/bookRepository";
import { GoogleBooksIsbnLookup } from "../data/googleBooks";
import { Json } from "../data/http";
import { CachingIsbnLookup, MergedIsbnLookup } from "../data/isbnLookup";
import { OpenLibraryIsbnLookup } from "../data/openLibrary";
import { BookFormat, Gift, Purchase, ReadingStatus, Shelf } from "../domain";
import { GiftSourceRequiredError, NotAcquiredError } from "../domain/exceptions";
import { Catalog } from "../presentation/model/catalog";
import { LibraryController } from "../presentation/model/libraryController";
import { UseCases } from "../service";
import { BookMetadata, BookSourceUnavailableError, IsbnLookup } from "../service/ports";
import { FOX, MY_PHOTO, foxLookup } from "./fixtures";

const FOX_ISBN10 = "0-14-032872-6"; // the same edition as FOX.isbn, 9780140328721

// Google Books' answer for the edition: it lists both ISBNs and has its own cover.
const googleJson = async (): Promise<Json> => ({
  items: [
    {
      volumeInfo: {
        title: "Fantastic Mr Fox",
        authors: ["Roald Dahl"],
        publisher: "Puffin Books",
        pageCount: 96,
        industryIdentifiers: [
          { type: "ISBN_10", identifier: "0140328726" },
          { type: "ISBN_13", identifier: "9780140328721" },
        ],
        imageLinks: { thumbnail: "http://books.google.com/fox?zoom=1&edge=curl" },
      },
    },
  ],
});

// Open Library's edition record (binding, its own cover), search doc, and work record.
const openLibraryJson = async (url: string): Promise<Json> => {
  if (url.includes("/isbn/")) {
    return { title: "Fantastic Mr. Fox", physical_format: "Paperback", covers: [8739161], works: [{ key: "/works/OL45804W" }] };
  }
  if (url.includes("search.json")) {
    return { docs: [{ title: "Fantastic Mr. Fox", author_name: ["Roald Dahl"], key: "/works/OL45804W" }] };
  }
  return { description: "A fox outwits three farmers.", subjects: ["Series: Fantastic Mr Fox"] };
};

/** The production wiring, with canned JSON in place of HTTP. */
function realLookup(repository: MemoryBookRepository): IsbnLookup {
  const google = new GoogleBooksIsbnLookup("KEY", googleJson, async () => "image/jpeg");
  return new CachingIsbnLookup(new MergedIsbnLookup([google, new OpenLibraryIsbnLookup(openLibraryJson)]), repository);
}

function library(lookup?: IsbnLookup, repository = new MemoryBookRepository(), ownerId = "local") {
  return new LibraryController(new UseCases(repository, lookup ?? realLookup(repository)), ownerId);
}

// --- Feature 1: Scan a book ---

describe("Feature 1: scan a book (exact edition, chosen cover)", () => {
  test("an ISBN-10 or ISBN-13 finds the same edition, merged from both sources", async () => {
    const shelf = library();
    const { metadata } = await shelf.lookup(FOX_ISBN10);
    expect(metadata.isbn).toBe(FOX.isbn); // one key per book
    expect(metadata).toMatchObject({
      title: "Fantastic Mr Fox", // Google listed first: it wins the title
      format: BookFormat.PAPERBACK, // only Open Library knows the binding
      description: "A fox outwits three farmers.", // from the work record
      series: "Fantastic Mr Fox",
    });
    // Every distinct cover is offered: Google's (flat, https) and this edition's from Open Library.
    expect(metadata.coverCandidates).toEqual([
      "https://books.google.com/fox?zoom=1",
      "https://covers.openlibrary.org/b/id/8739161-M.jpg",
    ]);
    expect((await shelf.lookup("978-0-14-032872-1")).metadata).toEqual(metadata);
  });

  test("the cover the owner picks, or their own photo, is the one saved", async () => {
    const shelf = library();
    const { metadata } = await shelf.lookup(FOX.isbn);
    const picked = await shelf.scan(metadata, Shelf.WANTED, ReadingStatus.UNREAD, undefined, {
      coverUrl: metadata.coverCandidates[1],
    });
    expect(picked.coverUrl).toBe("https://covers.openlibrary.org/b/id/8739161-M.jpg");
    expect((await shelf.changeCover(FOX.isbn, MY_PHOTO)).coverUrl).toBe(MY_PHOTO);
  });

  test("a partial answer still works: Google down, Open Library alone", async () => {
    const repository = new MemoryBookRepository();
    const down = new GoogleBooksIsbnLookup("KEY", async () => {
      throw new BookSourceUnavailableError("HTTP 429 from www.googleapis.com");
    }, async () => {
      throw new BookSourceUnavailableError("offline");
    });
    const lookup = new MergedIsbnLookup([down, new OpenLibraryIsbnLookup(openLibraryJson)]);
    const { metadata } = await library(lookup, repository).lookup(FOX.isbn);
    expect(metadata.title).toBe("Fantastic Mr. Fox");
    expect(metadata.coverCandidates).toEqual(["https://covers.openlibrary.org/b/id/8739161-M.jpg"]);
  });
});

// --- Feature 2: Shelve it, with rules enforced ---

describe("Feature 2: shelve it, with rules enforced", () => {
  const scanned = (lookup: IsbnLookup = foxLookup()) => {
    const shelf = library(lookup);
    return { shelf, metadata: FOX as BookMetadata };
  };

  test("Owned requires a purchase or a gift; nothing is saved without one", async () => {
    const { shelf, metadata } = scanned();
    await expect(shelf.scan(metadata, Shelf.OWNED, ReadingStatus.UNREAD)).rejects.toBeInstanceOf(NotAcquiredError);
    expect((await shelf.view()).owned).toHaveLength(0);
    const bought = await shelf.scan(metadata, Shelf.OWNED, ReadingStatus.UNREAD, new Purchase());
    expect(bought.acquisition?.describe()).toBe("Purchased");
  });

  test("a gift needs the giver's name; empty or blank names are refused", async () => {
    const { shelf, metadata } = scanned();
    for (const blank of ["", "   "]) {
      await expect(shelf.scan(metadata, Shelf.OWNED, ReadingStatus.UNREAD, new Gift(blank))).rejects.toBeInstanceOf(
        GiftSourceRequiredError,
      );
    }
    const gift = await shelf.scan(metadata, Shelf.OWNED, ReadingStatus.READ, new Gift("  Grandma "));
    expect(gift.giftedBy).toBe("Grandma");
    expect(gift.readingStatus).toBe(ReadingStatus.READ);
  });

  test("Wanted needs no purchase or gift, and can be read or unread", async () => {
    const { shelf, metadata } = scanned();
    const wanted = await shelf.scan(metadata, Shelf.WANTED, ReadingStatus.READ);
    expect(wanted).toMatchObject({ shelf: Shelf.WANTED, acquisition: null, readingStatus: ReadingStatus.READ });
  });

  test("scanning a book you already have adds a copy, however its ISBN is written", async () => {
    const repository = new MemoryBookRepository();
    const shelf = library(realLookup(repository), repository);
    const { metadata } = await shelf.lookup(FOX.isbn);
    await shelf.scan(metadata, Shelf.OWNED, ReadingStatus.UNREAD, new Purchase());
    const again = await shelf.lookup(FOX_ISBN10);
    expect(again.alreadyInLibrary).toBe(true);
    await shelf.scan(again.metadata, Shelf.OWNED, ReadingStatus.UNREAD);
    const owned = (await shelf.view()).owned;
    expect(owned).toHaveLength(1);
    expect(owned[0].copyCount).toBe(2);
  });
});

// --- Feature 3: Browse and manage your library ---

describe("Feature 3: browse and manage your library", () => {
  const book = (isbn: string, title: string, author: string, series = ""): BookMetadata => ({
    ...FOX,
    isbn,
    title,
    author,
    series,
    coverCandidates: [],
  });
  const DUNE = book("9780441172719", "Dune", "Frank Herbert", "Dune");
  const MESSIAH = book("9780593098233", "Dune Messiah", "Frank Herbert", "Dune");
  const MATILDA = book("9780142410370", "Matilda", "Roald Dahl");
  const BELOVED = book("9781400033416", "Beloved", "Toni Morrison");

  async function stockedShelf() {
    const catalog: Record<string, BookMetadata> = Object.fromEntries(
      [DUNE, MESSIAH, MATILDA, BELOVED].map((entry) => [entry.isbn, entry]),
    );
    const shelf = library({ byIsbn: async (isbn) => catalog[isbn] });
    await shelf.scan(DUNE, Shelf.OWNED, ReadingStatus.UNREAD, new Purchase());
    await shelf.scan(MESSIAH, Shelf.OWNED, ReadingStatus.READ, new Purchase());
    await shelf.scan(MATILDA, Shelf.OWNED, ReadingStatus.UNREAD, new Gift("Grandma"));
    await shelf.scan(BELOVED, Shelf.WANTED, ReadingStatus.UNREAD);
    return shelf;
  }
  const titles = (books: { title: string }[]) => books.map((entry) => entry.title).sort();

  test("TBR splits Owned into unread and read; Wanted lists only wanted books", async () => {
    const view = await (await stockedShelf()).view();
    expect(titles(view.toBeRead(ReadingStatus.UNREAD))).toEqual(["Dune", "Matilda"]);
    expect(titles(view.toBeRead(ReadingStatus.READ))).toEqual(["Dune Messiah"]);
    expect(titles(view.wanted)).toEqual(["Beloved"]);
  });

  test("the Owned catalog groups A–Z, by author, and by series", async () => {
    const owned = (await (await stockedShelf()).view()).owned;
    const grouped = (mode: "az" | "author" | "series") =>
      Catalog.sections(owned, mode).map((section) => [section.title, titles(section.data)]);
    expect(grouped("az")).toEqual([["D", ["Dune", "Dune Messiah"]], ["M", ["Matilda"]]]);
    expect(grouped("author")).toEqual([["Frank Herbert", ["Dune", "Dune Messiah"]], ["Roald Dahl", ["Matilda"]]]);
    expect(grouped("series")).toEqual([["Dune", ["Dune", "Dune Messiah"]], ["Standalone", ["Matilda"]]]);
  });

  test("from a book's page: mark read, move (with the acquisition rule), change cover, delete", async () => {
    const shelf = await stockedShelf();
    expect((await shelf.setReading(DUNE.isbn, ReadingStatus.READ)).readingStatus).toBe(ReadingStatus.READ);

    await expect(shelf.move(BELOVED.isbn, Shelf.OWNED, ReadingStatus.UNREAD)).rejects.toBeInstanceOf(NotAcquiredError);
    expect((await shelf.view()).find(BELOVED.isbn)?.shelf).toBe(Shelf.WANTED); // refused move saved nothing
    expect((await shelf.move(BELOVED.isbn, Shelf.OWNED, ReadingStatus.UNREAD, new Gift("Sam"))).shelf).toBe(Shelf.OWNED);
    expect((await shelf.move(MATILDA.isbn, Shelf.WANTED, ReadingStatus.UNREAD)).shelf).toBe(Shelf.WANTED);

    expect((await shelf.changeCover(DUNE.isbn, MY_PHOTO)).coverUrl).toBe(MY_PHOTO);
    await shelf.remove(MESSIAH.isbn);
    expect((await shelf.view()).find(MESSIAH.isbn)).toBeNull();
  });
});

// --- Feature 4: Google Account library sync (planned for the second half) ---

describe("Feature 4 readiness: every library belongs to one account", () => {
  test("two accounts on one store never see or change each other's books", async () => {
    const repository = new MemoryBookRepository();
    const alice = library(foxLookup(), repository, "google:alice");
    const bob = library(foxLookup(), repository, "google:bob");
    await alice.scan(FOX, Shelf.OWNED, ReadingStatus.UNREAD, new Purchase());
    await bob.scan(FOX, Shelf.WANTED, ReadingStatus.UNREAD);

    await bob.remove(FOX.isbn);
    expect((await bob.view()).wanted).toHaveLength(0);
    expect((await alice.view()).owned.map((entry) => entry.title)).toEqual([FOX.title]);
  });
  // The storage side of this rule is the BookRepository contract in persistence.test.ts,
  // which the sync adapter will have to pass like the Memory, JSON and SQLite adapters.
});
