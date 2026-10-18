/**
 * Tests: bad input and bad networks — ISBN checksums and formats, the lookup
 * use case rejecting a typo before any network call, Http turning timeouts,
 * error statuses and malformed JSON into one BookSourceUnavailableError, the
 * merged lookup falling back, and the banner the owner sees for each.
 */
import { GoogleBooksIsbnLookup } from "../data/googleBooks";
import { Http } from "../data/http";
import { MergedIsbnLookup } from "../data/isbnLookup";
import { OpenLibraryIsbnLookup } from "../data/openLibrary";
import { Isbn, Shelf } from "../domain";
import { InvalidIsbnError, IsbnNotFoundError } from "../domain/exceptions";
import { LibraryAppModel } from "../presentation/model/libraryAppModel";
import { LibraryController } from "../presentation/model/libraryController";
import { LookupIsbnUseCase, UseCases } from "../service";
import { BookSourceUnavailableError, IsbnLookup } from "../service/ports";
import { MemoryBookRepository } from "../data/bookRepository";
import { FOX, FakeCoverCamera, foxLookup } from "./fixtures";

// --- ISBN validation ---

describe("Isbn", () => {
  test("accepts ISBN-13 and ISBN-10 with any hyphens, spaces, or an ISBN prefix", () => {
    for (const valid of ["9780140328721", "978-0-14-032872-1", "ISBN 978 0 14 032872 1", "0140328726", "0-14-032872-6", "080442957X", "080442957x", "9791032300824"]) {
      expect(Isbn.isValid(valid)).toBe(true);
    }
    // An ISBN-10 becomes its ISBN-13, so one book has one key however it was entered.
    expect(Isbn.parse(" isbn: 0-8044-2957-x ")).toBe("9780804429573");
    expect(Isbn.parse("0-14-032872-6")).toBe(Isbn.parse("978-0-14-032872-1"));
  });

  test("canonical leaves an ISBN-13, and anything that isn't a valid ISBN-10, as it is", () => {
    expect(Isbn.canonical("9780140328721")).toBe("9780140328721");
    expect(Isbn.canonical("0140328727")).toBe("0140328727"); // wrong check digit: not converted
  });

  test("rejects wrong check digits, wrong lengths, non-book barcodes, and empty input", () => {
    for (const invalid of ["9780140328722", "0140328727", "978014032872", "97801403287211", "0012345678905", "X804429570", "", "   ", "abc"]) {
      expect(Isbn.isValid(invalid)).toBe(false);
    }
    expect(() => Isbn.parse("9780140328722")).toThrow(InvalidIsbnError);
    expect(() => Isbn.parse("   ")).toThrow("Enter an ISBN to look up.");
  });
});

test("the lookup use case rejects a typo before asking any book source", async () => {
  let asked = 0;
  const source: IsbnLookup = {
    byIsbn: async (isbn) => {
      asked += 1;
      return foxLookup().byIsbn(isbn);
    },
  };
  const lookup = new LookupIsbnUseCase(source);
  await expect(lookup.execute("9780140328722")).rejects.toBeInstanceOf(InvalidIsbnError);
  await expect(lookup.execute("")).rejects.toBeInstanceOf(InvalidIsbnError);
  expect(asked).toBe(0);
  expect((await lookup.execute("ISBN 978-0-14-032872-1")).title).toBe(FOX.title);
});

test("scanning validates the ISBN too, so nothing invalid is ever saved", async () => {
  const repository = new MemoryBookRepository();
  const { scan } = new UseCases(repository, foxLookup());
  await expect(scan.execute("local", "123", Shelf.WANTED)).rejects.toBeInstanceOf(InvalidIsbnError);
  expect((await repository.loadLibrary("local")).books).toHaveLength(0);
});

// --- Http failures ---

describe("Http", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    jest.useRealTimers();
  });

  const respond = (body: string, status = 200) =>
    (globalThis.fetch = jest.fn(async () => new Response(body, { status })) as typeof fetch);

  test("an error status (404, 429 rate limit, 500) is a BookSourceUnavailableError", async () => {
    for (const status of [404, 429, 500]) {
      respond("{}", status);
      await expect(Http.getJson("https://openlibrary.org/isbn/1.json")).rejects.toThrow(BookSourceUnavailableError);
    }
  });

  test("malformed JSON, or JSON that isn't an object, is a BookSourceUnavailableError", async () => {
    for (const body of ["<html>busy</html>", '{"docs": [', "[]", "null"]) {
      respond(body);
      await expect(Http.getJson("https://openlibrary.org/search.json")).rejects.toThrow(BookSourceUnavailableError);
    }
  });

  test("being offline is a BookSourceUnavailableError", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Network request failed");
    }) as typeof fetch;
    await expect(Http.getJson("https://openlibrary.org/search.json")).rejects.toThrow(BookSourceUnavailableError);
  });

  test("a source that never answers times out instead of hanging the scan", async () => {
    jest.useFakeTimers();
    globalThis.fetch = jest.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) =>
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))),
        ),
    ) as typeof fetch;
    const pending = Http.getJson("https://openlibrary.org/search.json");
    const outcome = expect(pending).rejects.toThrow(BookSourceUnavailableError);
    await jest.advanceTimersByTimeAsync(15_000);
    await outcome;
  });

  test("an error never repeats the request URL, so the Google API key stays out of messages", async () => {
    respond("{}", 403);
    const error = await Http.getJson("https://www.googleapis.com/books/v1/volumes?q=isbn:1&key=SECRET-KEY").catch(
      (caught: BookSourceUnavailableError) => caught,
    );
    expect(String(error.detail)).not.toContain("SECRET-KEY");
    expect(error.message).not.toContain("SECRET-KEY");
  });
});

// --- Sources falling back ---

const unavailable = async (): Promise<never> => {
  throw new BookSourceUnavailableError("HTTP 429 from www.googleapis.com");
};

test("Google rate-limited: Open Library still answers the scan", async () => {
  const google = new GoogleBooksIsbnLookup("KEY", unavailable, unavailable);
  const merged = new MergedIsbnLookup([google, foxLookup()]);
  expect((await merged.byIsbn(FOX.isbn)).title).toBe(FOX.title);
});

test("Open Library: no edition (404) and no search result is 'not found', not an outage", async () => {
  const lookup = new OpenLibraryIsbnLookup(async (url) => {
    if (url.includes("/isbn/")) {
      throw new BookSourceUnavailableError("HTTP 404 from openlibrary.org");
    }
    return { numFound: 0, docs: [] };
  });
  await expect(lookup.byIsbn(FOX.isbn)).rejects.toBeInstanceOf(IsbnNotFoundError);
});

test("Open Library: a search result with an odd shape still finds the title it can read", async () => {
  const lookup = new OpenLibraryIsbnLookup(async (url) =>
    url.includes("/isbn/") ? { title: ["Fantastic Mr. Fox"], number_of_pages: "ninety" } : { docs: "not a list" },
  );
  const metadata = await lookup.byIsbn(FOX.isbn);
  expect(metadata.title).toBe("Fantastic Mr. Fox");
  expect(metadata.pageCount).toBe(0);
});

test("every source unreachable: the merged lookup reports the outage, not 'not found'", async () => {
  const google = new GoogleBooksIsbnLookup("KEY", unavailable, unavailable);
  const openLibrary = new OpenLibraryIsbnLookup(unavailable);
  await expect(new MergedIsbnLookup([google, openLibrary]).byIsbn(FOX.isbn)).rejects.toBeInstanceOf(
    BookSourceUnavailableError,
  );
});

test("an ISBN-10 typed by the owner matches Google's volume listing that ISBN-10", async () => {
  const lookup = new GoogleBooksIsbnLookup(
    "KEY",
    async () => ({
      items: [
        {
          volumeInfo: {
            title: "Fantastic Mr. Fox",
            authors: ["Roald Dahl"],
            industryIdentifiers: [
              { type: "ISBN_10", identifier: "0140328726" },
              { type: "ISBN_13", identifier: "9780140328721" },
            ],
          },
        },
      ],
    }),
    async () => "image/png",
  );
  expect((await lookup.byIsbn("0-14-032872-6")).title).toBe("Fantastic Mr. Fox");
});

// --- What the owner sees ---

async function modelWith(lookup: IsbnLookup): Promise<LibraryAppModel> {
  const model = new LibraryAppModel(
    async () => new LibraryController(new UseCases(new MemoryBookRepository(), lookup), "local"),
    new FakeCoverCamera(),
  );
  await model.start();
  return model;
}

test("a mistyped ISBN shows how to fix it, as a normal notice", async () => {
  const model = await modelWith(foxLookup());
  await model.scan("9780140328722");
  expect(model.getState().flash).toMatchObject({
    text: "9780140328722 is not a valid ISBN. Check the number and try again.",
    tone: "info",
  });
  expect(model.getState().prompt).toBeNull();
  model.dispose();
});

test("unreachable book sources show a retry message in red, and nothing is added", async () => {
  const model = await modelWith({ byIsbn: unavailable });
  await model.scan(FOX.isbn);
  expect(model.getState().flash).toMatchObject({
    text: "Couldn't reach the book sources. Check your connection and try again.",
    tone: "danger",
  });
  expect(model.getState().view.owned).toHaveLength(0);
  model.dispose();
});
