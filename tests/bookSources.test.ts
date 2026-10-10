/**
 * Tests: the book sources with canned JSON (no network) — Open Library
 * (edition-first), Google Books (exact-edition only), how MergedIsbnLookup
 * combines them, and how CachingIsbnLookup avoids asking twice.
 */
import { GoogleBooksIsbnLookup } from "../data/googleBooks";
import { MemoryBookRepository } from "../data/bookRepository";
import { CachingIsbnLookup, MergedIsbnLookup } from "../data/isbnLookup";
import { Json } from "../data/http";
import { OpenLibraryIsbnLookup } from "../data/openLibrary";
import { BookFormat } from "../domain";
import { IsbnNotFoundError } from "../domain/exceptions";
import { BookMetadata, IsbnLookup } from "../service/ports";
import { FOX, foxLookup } from "./fixtures";

const VERNE = "9781503215153";

// --- Open Library ---

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

test("open library prefers this edition's cover, publisher and binding over the work's", async () => {
  const lookup = new OpenLibraryIsbnLookup(async (url) =>
    url.includes("/isbn/")
      ? {
          title: "Around the World in 80 Days",
          publishers: ["CreateSpace Independent Publishing Platform"],
          covers: [12377125, -1],
          physical_format: "Paperback",
          publish_date: "Nov 06, 2018",
          number_of_pages: 160,
        }
      : {
          docs: [
            {
              title: "Around the World in 80 Days",
              author_name: ["Jules Verne"],
              publisher: ["Some Other Press"],
              cover_i: 555,
            },
          ],
        },
  );
  const metadata = await lookup.byIsbn(VERNE);
  expect(metadata.publisher).toBe("CreateSpace Independent Publishing Platform");
  expect(metadata.author).toBe("Jules Verne");
  expect(metadata.format).toBe(BookFormat.PAPERBACK);
  // Only the edition's own cover; the work's cover (another edition) is left out, -1 is deleted.
  expect(metadata.coverCandidates).toEqual(["https://covers.openlibrary.org/b/id/12377125-M.jpg"]);
  expect(metadata.coverUrl).toBe(metadata.coverCandidates[0]);
});

test("open library reads each binding wording", async () => {
  const formatOf = async (physical_format: string) =>
    (
      await new OpenLibraryIsbnLookup(async (url) =>
        url.includes("/isbn/") ? { title: "T", physical_format } : { docs: [] },
      ).byIsbn(VERNE)
    ).format;
  expect(await formatOf("Hardcover")).toBe(BookFormat.HARDCOVER);
  expect(await formatOf("Library Binding")).toBe(BookFormat.HARDCOVER);
  expect(await formatOf("Mass Market Paperback")).toBe(BookFormat.PAPERBACK);
  expect(await formatOf("Audio CD")).toBe(BookFormat.UNKNOWN);
});

test("open library: an unknown ISBN is a domain error, being offline is not", async () => {
  const unknown = new OpenLibraryIsbnLookup(async (url) => {
    if (url.includes("/isbn/")) {
      throw new Error("HTTP 404");
    }
    return { docs: [] };
  });
  await expect(unknown.byIsbn(VERNE)).rejects.toBeInstanceOf(IsbnNotFoundError);

  const offline = new OpenLibraryIsbnLookup(async () => {
    throw new Error("Network request failed");
  });
  await expect(offline.byIsbn(VERNE)).rejects.toThrow("Network request failed");
});

// --- Google Books ---

function googleVolume(isbn13: string, extra: Json = {}): Json {
  return {
    volumeInfo: {
      title: "Around the World in 80 Days",
      authors: ["Jules Verne"],
      publisher: "CreateSpace",
      publishedDate: "2014-12-02",
      pageCount: 160,
      industryIdentifiers: [{ type: "ISBN_13", identifier: isbn13 }],
      imageLinks: { thumbnail: "http://books.google.com/books/content?id=X&zoom=1&edge=curl&source=gbs_api" },
      ...extra,
    },
  };
}

// What Google's cover-by-ISBN image answers: a real cover is JPEG, "no image" is PNG.
const realCover = async () => "image/jpeg";
const noCover = async () => "image/png";
const GOOGLE_ISBN_COVER = `https://books.google.com/books/content?vid=ISBN${VERNE}&printsec=frontcover&img=1&zoom=1`;

test("google books returns the volume that lists the scanned ISBN, with a clean https cover", async () => {
  const urls: string[] = [];
  const lookup = new GoogleBooksIsbnLookup(
    "KEY",
    async (url) => {
      urls.push(url);
      return { items: [googleVolume("9780000000000"), googleVolume(VERNE)] };
    },
    realCover,
  );
  const metadata = await lookup.byIsbn(VERNE);
  expect(urls[0]).toContain("q=isbn:9781503215153");
  expect(urls[0]).toContain("key=KEY");
  expect(metadata.coverUrl).toBe("https://books.google.com/books/content?id=X&zoom=1&source=gbs_api");
  expect(metadata.coverCandidates).toEqual([metadata.coverUrl]);
  expect(metadata.format).toBe(BookFormat.UNKNOWN);
});

test("google books never passes off a different edition as this one", async () => {
  const lookup = new GoogleBooksIsbnLookup(
    "KEY",
    async () => ({ items: [googleVolume("9780000000000")] }),
    noCover,
  );
  await expect(lookup.byIsbn(VERNE)).rejects.toBeInstanceOf(IsbnNotFoundError);
});

test("google books offers its cover-by-ISBN image when the search has no volume", async () => {
  const lookup = new GoogleBooksIsbnLookup("KEY", async () => ({ totalItems: 0 }), realCover);
  const metadata = await lookup.byIsbn(VERNE);
  expect(metadata.coverCandidates).toEqual([GOOGLE_ISBN_COVER]);
  expect(metadata.title).toBe(""); // cover only: the other source supplies the details
});

test("google books offers the cover unchecked when it can't be read (web browser, no CORS)", async () => {
  const lookup = new GoogleBooksIsbnLookup("KEY", async () => ({ totalItems: 0 }), async () => {
    throw new TypeError("Failed to fetch");
  });
  expect((await lookup.byIsbn(VERNE)).coverCandidates).toEqual([GOOGLE_ISBN_COVER]);
});

// --- Merging sources ---

class StubLookup implements IsbnLookup {
  constructor(private readonly answer: BookMetadata | Error) {}

  async byIsbn(): Promise<BookMetadata> {
    if (this.answer instanceof Error) {
      throw this.answer;
    }
    return this.answer;
  }
}

test("merged lookup: first source wins each field, every distinct cover is kept", async () => {
  const google: BookMetadata = {
    ...FOX,
    title: "Fantastic Mr Fox (Google)",
    series: "",
    format: BookFormat.UNKNOWN,
    coverUrl: "https://google/fox.jpg",
    coverCandidates: ["https://google/fox.jpg"],
  };
  const openLibrary: BookMetadata = {
    ...FOX,
    title: "Fantastic Mr. Fox",
    series: "Fox Tales",
    format: BookFormat.PAPERBACK,
    coverUrl: "https://ol/fox.jpg",
    coverCandidates: ["https://ol/fox.jpg", "https://google/fox.jpg"],
  };
  const merged = await new MergedIsbnLookup([new StubLookup(google), new StubLookup(openLibrary)]).byIsbn(
    FOX.isbn,
  );
  expect(merged.title).toBe("Fantastic Mr Fox (Google)");
  expect(merged.series).toBe("Fox Tales"); // Google had none
  expect(merged.format).toBe(BookFormat.PAPERBACK); // Google never knows the binding
  expect(merged.coverCandidates).toEqual(["https://google/fox.jpg", "https://ol/fox.jpg"]);
  expect(merged.coverUrl).toBe("https://google/fox.jpg");
});

test("merged lookup: a cover-only answer joins the other source's details but can't stand alone", async () => {
  const coverOnly: BookMetadata = {
    ...FOX,
    title: "",
    author: "",
    publisher: "",
    coverUrl: GOOGLE_ISBN_COVER,
    coverCandidates: [GOOGLE_ISBN_COVER],
  };
  const merged = await new MergedIsbnLookup([new StubLookup(coverOnly), foxLookup()]).byIsbn(FOX.isbn);
  expect(merged.title).toBe(FOX.title);
  expect(merged.coverCandidates).toEqual([GOOGLE_ISBN_COVER, ...FOX.coverCandidates]);
  await expect(new MergedIsbnLookup([new StubLookup(coverOnly)]).byIsbn(FOX.isbn)).rejects.toBeInstanceOf(
    IsbnNotFoundError,
  );
});

test("merged lookup: one source failing is fine; all failing reports the domain reason", async () => {
  const quota = new StubLookup(new Error("HTTP 429"));
  expect((await new MergedIsbnLookup([quota, foxLookup()]).byIsbn(FOX.isbn)).title).toBe(FOX.title);
  const notFound = new StubLookup(new IsbnNotFoundError(FOX.isbn));
  await expect(new MergedIsbnLookup([quota, notFound]).byIsbn(FOX.isbn)).rejects.toBeInstanceOf(
    IsbnNotFoundError,
  );
});

// --- Cache ---

test("caching lookup answers a repeated ISBN from the cache, not the sources", async () => {
  let asked = 0;
  const source: IsbnLookup = {
    byIsbn: async (isbn) => {
      asked += 1;
      return foxLookup().byIsbn(isbn);
    },
  };
  const lookup = new CachingIsbnLookup(source, new MemoryBookRepository());
  const first = await lookup.byIsbn(FOX.isbn);
  const second = await lookup.byIsbn(FOX.isbn);
  expect(asked).toBe(1);
  expect(second).toEqual(first);
});
