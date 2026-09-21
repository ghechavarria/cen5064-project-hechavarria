/**
 * Tests: Service use cases against memory/fake Data adapters.
 */
import { Acquisition, ReadingStatus, Shelf } from "../domain";
import { MemoryBookRepository } from "../data/bookRepository";
import { FakeIsbnLookup, OpenLibraryIsbnLookup } from "../data/isbnLookup";
import { BookNotFoundError, NotAcquiredError } from "../domain/exceptions";
import {
  DeleteBookUseCase,
  FillMissingFactsUseCase,
  LookupIsbnUseCase,
  MoveBookToShelfUseCase,
  ScanBookUseCase,
  SetReadingStatusUseCase,
} from "../service";
import { BookMetadata } from "../service/ports";

const FOX: BookMetadata = {
  isbn: "9780140328721",
  title: "Fantastic Mr. Fox",
  author: "Roald Dahl",
  coverUrl: "https://covers.openlibrary.org/b/isbn/9780140328721-M.jpg",
  publisher: "Puffin",
  series: "Fantastic Mr Fox",
  description: "A fox outwits three farmers.",
  published: "1970",
  pageCount: 96,
  subjects: "Animals, Children's stories",
};

function stack() {
  const repo = new MemoryBookRepository();
  return {
    repo,
    scan: new ScanBookUseCase(repo, new FakeIsbnLookup({ [FOX.isbn]: FOX })),
    lookup: new LookupIsbnUseCase(new FakeIsbnLookup({ [FOX.isbn]: FOX })),
    move: new MoveBookToShelfUseCase(repo),
    reading: new SetReadingStatusUseCase(repo),
    remove: new DeleteBookUseCase(repo),
  };
}

test("lookup isbn does not save a library row", async () => {
  const { repo, lookup } = stack();
  const metadata = await lookup.execute("978-0140328721");
  expect(metadata.title).toBe("Fantastic Mr. Fox");
  expect(metadata.coverUrl).toContain("9780140328721");
  expect((await repo.loadLibrary("local")).books).toHaveLength(0);
});

test("scan new isbn looks up metadata and saves as unread", async () => {
  const { repo, scan } = stack();
  const book = await scan.execute("local", "978-0140328721", Shelf.OWNED);
  expect(book.title).toBe("Fantastic Mr. Fox");
  expect(book.readingStatus).toBe(ReadingStatus.UNREAD);
  expect(book.series).toBe("Fantastic Mr Fox");
  expect((await repo.loadLibrary("local")).get(FOX.isbn).shelf).toBe(Shelf.OWNED);
});

test("scan can land as read", async () => {
  const { scan } = stack();
  const book = await scan.execute("local", FOX.isbn, Shelf.WANTED, ReadingStatus.READ);
  expect(book.shelf).toBe(Shelf.WANTED);
  expect(book.readingStatus).toBe(ReadingStatus.READ);
});

test("scan duplicate isbn increments copies and skips a second row", async () => {
  const { repo, scan } = stack();
  await scan.execute("local", FOX.isbn, Shelf.OWNED);
  const again = await scan.execute("local", FOX.isbn, Shelf.WANTED);
  expect(again.copyCount).toBe(2);
  expect(again.shelf).toBe(Shelf.OWNED);
  expect((await repo.loadLibrary("local")).books).toHaveLength(1);
});

test("move from wanted to owned is blocked until purchased", async () => {
  const { scan, move } = stack();
  await scan.execute("local", FOX.isbn, Shelf.WANTED);
  await expect(move.execute("local", FOX.isbn, Shelf.OWNED)).rejects.toBeInstanceOf(
    NotAcquiredError,
  );
  const owned = await move.execute("local", FOX.isbn, Shelf.OWNED, {
    type: Acquisition.PURCHASED,
  });
  expect(owned.shelf).toBe(Shelf.OWNED);
});

test("gifted wanted book records gifter", async () => {
  const { scan, move } = stack();
  await scan.execute("local", FOX.isbn, Shelf.WANTED);
  const gifted = await move.execute("local", FOX.isbn, Shelf.OWNED, {
    type: Acquisition.GIFTED,
    giftedBy: "Sam",
  });
  expect(gifted.giftedBy).toBe("Sam");
});

test("set reading status does not change owned vs wanted", async () => {
  const { scan, reading, repo } = stack();
  await scan.execute("local", FOX.isbn, Shelf.WANTED);
  const updated = await reading.execute("local", FOX.isbn, ReadingStatus.READ);
  expect(updated.readingStatus).toBe(ReadingStatus.READ);
  expect(updated.shelf).toBe(Shelf.WANTED);
  expect((await repo.loadLibrary("local")).get(FOX.isbn).shelf).toBe(Shelf.WANTED);
});

test("delete removes the title", async () => {
  const { scan, remove, repo } = stack();
  await scan.execute("local", FOX.isbn, Shelf.OWNED);
  await remove.execute("local", FOX.isbn);
  expect((await repo.loadLibrary("local")).books).toHaveLength(0);
  await expect(remove.execute("local", FOX.isbn)).rejects.toBeInstanceOf(BookNotFoundError);
});

test("open library parser reads search.json docs", async () => {
  const lookup = new OpenLibraryIsbnLookup(async () => ({
    docs: [
      {
        title: "Fantastic Mr. Fox",
        author_name: ["Roald Dahl"],
        publisher: ["Puffin"],
        cover_i: 99,
      },
    ],
  }));
  const metadata = await lookup.byIsbn(FOX.isbn);
  expect(metadata.author).toBe("Roald Dahl");
  expect(metadata.coverUrl).toContain("99");
});

test("open library edition fills series and description", async () => {
  const lookup = new OpenLibraryIsbnLookup(async (url) => {
    if (url.includes("/isbn/")) {
      return {
        series: ["Fantastic Mr Fox"],
        number_of_pages: 96,
        publish_date: "1970",
        subjects: ["Animals"],
        description: { value: "A fox outwits three farmers." },
      };
    }
    return {
      docs: [
        {
          title: "Fantastic Mr. Fox",
          author_name: ["Roald Dahl"],
          publisher: ["Puffin"],
          cover_i: 99,
        },
      ],
    };
  });
  const metadata = await lookup.byIsbn(FOX.isbn);
  expect(metadata.series).toBe("Fantastic Mr Fox");
  expect(metadata.description).toContain("fox");
  expect(metadata.pageCount).toBe(96);
  expect(metadata.published).toBe("1970");
  expect(metadata.subjects).toBe("Animals");
});

test("open library work subjects fill series when the edition has none", async () => {
  const lookup = new OpenLibraryIsbnLookup(async (url) => {
    if (url.includes("/works/")) {
      return { subjects: ["young-adult", "Serie:Once_Upon_a_Broken_Heart"] };
    }
    if (url.includes("/isbn/")) {
      return { number_of_pages: 416 };
    }
    return {
      docs: [
        {
          title: "The Ballad of Never After",
          author_name: ["Stephanie Garber"],
          key: "/works/OL27090610W",
          cover_i: 1,
        },
      ],
    };
  });
  expect((await lookup.byIsbn("9781250268419")).series).toBe("Once Upon a Broken Heart");
});

test("open library series drops volume suffixes", async () => {
  const lookup = new OpenLibraryIsbnLookup(async (url) => {
    if (url.includes("/isbn/")) {
      return {
        series: ["Once Upon a Broken Heart (#1)"],
        description: "Evangeline Fox.",
      };
    }
    return {
      docs: [
        {
          title: "Once Upon a Broken Heart",
          author_name: ["Stephanie Garber"],
          cover_i: 1,
        },
      ],
    };
  });
  expect((await lookup.byIsbn("9781250268396")).series).toBe("Once Upon a Broken Heart");
});

test("open library ignores source-title notes", async () => {
  const lookup = new OpenLibraryIsbnLookup(async (url) => {
    if (url.includes("/isbn/")) {
      return { notes: "Source title: A Curse for True Love (Once Upon a Broken Heart, 3)" };
    }
    return {
      docs: [
        {
          title: "A Curse for True Love",
          author_name: ["Stephanie Garber"],
          cover_i: 1,
        },
      ],
    };
  });
  expect((await lookup.byIsbn("9781250851208")).description).toBe("");
});

test("fill missing facts writes series without adding a copy", async () => {
  const repo = new MemoryBookRepository();
  await new ScanBookUseCase(
    repo,
    new FakeIsbnLookup({ [FOX.isbn]: { ...FOX, series: "" } }),
  ).execute("local", FOX.isbn, Shelf.OWNED);
  await new FillMissingFactsUseCase(repo, new FakeIsbnLookup({ [FOX.isbn]: FOX })).execute("local");
  expect((await repo.loadLibrary("local")).get(FOX.isbn).series).toBe("Fantastic Mr Fox");
  expect((await repo.loadLibrary("local")).get(FOX.isbn).copyCount).toBe(1);
});
