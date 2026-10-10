/**
 * Tests: Service use cases against memory/fake Data adapters.
 */
import { Acquisition, BookFormat, Gift, Purchase, ReadingStatus, Shelf } from "../domain";
import { MemoryBookRepository } from "../data/bookRepository";
import { BookNotFoundError, GiftSourceRequiredError, NotAcquiredError } from "../domain/exceptions";
import {
  FillMissingFactsUseCase,
  ScanBookUseCase,
} from "../service";
import { FOX, MY_PHOTO, foxLookup, memoryStack } from "./fixtures";

// Short names used throughout this file.
function stack() {
  const { repo, scan, lookup, move, setStatus, removeBook, loadLibrary } = memoryStack();
  return { repo, scan, lookup, move, reading: setStatus, remove: removeBook, load: loadLibrary };
}

test("lookup isbn does not save a library row", async () => {
  const { repo, lookup } = stack();
  const metadata = await lookup.execute("978-0140328721");
  expect(metadata.title).toBe("Fantastic Mr. Fox");
  expect(metadata.coverUrl).toContain("9780140328721");
  expect((await repo.loadLibrary("local")).books).toHaveLength(0);
});

test("load library returns scanned books grouped by shelf", async () => {
  const { scan, load } = stack();
  await scan.execute("local", FOX.isbn, Shelf.WANTED);
  const library = await load.execute("local");
  expect(library.booksOn(Shelf.WANTED).map((book) => book.isbn)).toEqual([FOX.isbn]);
  expect(library.booksOn(Shelf.OWNED)).toHaveLength(0);
});

test("scan new isbn looks up metadata and saves as unread", async () => {
  const { repo, scan } = stack();
  const book = await scan.execute(
    "local",
    "978-0140328721",
    Shelf.OWNED,
    ReadingStatus.UNREAD,
    new Purchase(),
  );
  expect(book.title).toBe("Fantastic Mr. Fox");
  expect(book.readingStatus).toBe(ReadingStatus.UNREAD);
  expect(book.series).toBe("Fantastic Mr Fox");
  expect((await repo.loadLibrary("local")).get(FOX.isbn).shelf).toBe(Shelf.OWNED);
});

test("scan into owned is blocked until purchased or gifted", async () => {
  const { repo, scan } = stack();
  await expect(scan.execute("local", FOX.isbn, Shelf.OWNED)).rejects.toBeInstanceOf(
    NotAcquiredError,
  );
  expect((await repo.loadLibrary("local")).books).toHaveLength(0);
});

test("scan into owned as a gift records the giver", async () => {
  const { repo, scan } = stack();
  await scan.execute("local", FOX.isbn, Shelf.OWNED, ReadingStatus.UNREAD, new Gift("Grandma"));
  const saved = (await repo.loadLibrary("local")).get(FOX.isbn);
  expect(saved.acquiredAs).toBe(Acquisition.GIFTED);
  expect(saved.giftedBy).toBe("Grandma");
});

test("scan into owned as a gift needs a giver", async () => {
  const { repo, scan } = stack();
  await expect(
    scan.execute("local", FOX.isbn, Shelf.OWNED, ReadingStatus.UNREAD, new Gift("  ")),
  ).rejects.toBeInstanceOf(GiftSourceRequiredError);
  expect((await repo.loadLibrary("local")).books).toHaveLength(0);
});

test("scan into wanted needs no acquisition", async () => {
  const { scan } = stack();
  const book = await scan.execute("local", FOX.isbn, Shelf.WANTED);
  expect(book.acquiredAs).toBeNull();
});

test("scan can land as read", async () => {
  const { scan } = stack();
  const book = await scan.execute("local", FOX.isbn, Shelf.WANTED, ReadingStatus.READ);
  expect(book.shelf).toBe(Shelf.WANTED);
  expect(book.readingStatus).toBe(ReadingStatus.READ);
});

test("scan duplicate isbn increments copies and skips a second row", async () => {
  const { repo, scan } = stack();
  await scan.execute("local", FOX.isbn, Shelf.OWNED, ReadingStatus.UNREAD, new Purchase());
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
  const owned = await move.execute("local", FOX.isbn, Shelf.OWNED, new Purchase());
  expect(owned.shelf).toBe(Shelf.OWNED);
});

test("gifted wanted book records gifter", async () => {
  const { scan, move } = stack();
  await scan.execute("local", FOX.isbn, Shelf.WANTED);
  const gifted = await move.execute("local", FOX.isbn, Shelf.OWNED, new Gift("Sam"));
  expect(gifted.giftedBy).toBe("Sam");
});

test("purchased move saves acquisition and reading status", async () => {
  const { repo, scan, move } = stack();
  await scan.execute("local", FOX.isbn, Shelf.WANTED);
  await move.execute("local", FOX.isbn, Shelf.OWNED, new Purchase());
  const saved = (await repo.loadLibrary("local")).get(FOX.isbn);
  expect(saved.shelf).toBe(Shelf.OWNED);
  expect(saved.acquiredAs).toBe(Acquisition.PURCHASED);
  expect(saved.giftedBy).toBeNull();
  expect(saved.readingStatus).toBe(ReadingStatus.UNREAD);
});

test("gifted move saves the giver", async () => {
  const { repo, scan, move } = stack();
  await scan.execute("local", FOX.isbn, Shelf.WANTED);
  await move.execute("local", FOX.isbn, Shelf.OWNED, new Gift("Sam"));
  const saved = (await repo.loadLibrary("local")).get(FOX.isbn);
  expect(saved.shelf).toBe(Shelf.OWNED);
  expect(saved.acquiredAs).toBe(Acquisition.GIFTED);
  expect(saved.giftedBy).toBe("Sam");
});

test("move without acquisition leaves the saved book wanted", async () => {
  const { repo, scan, move } = stack();
  await scan.execute("local", FOX.isbn, Shelf.WANTED);
  await expect(move.execute("local", FOX.isbn, Shelf.OWNED)).rejects.toBeInstanceOf(
    NotAcquiredError,
  );
  const saved = (await repo.loadLibrary("local")).get(FOX.isbn);
  expect(saved.shelf).toBe(Shelf.WANTED);
  expect(saved.acquiredAs).toBeNull();
});

test("empty giver leaves the saved book wanted", async () => {
  const { repo, scan, move } = stack();
  await scan.execute("local", FOX.isbn, Shelf.WANTED);
  await expect(
    move.execute("local", FOX.isbn, Shelf.OWNED, new Gift("")),
  ).rejects.toBeInstanceOf(GiftSourceRequiredError);
  expect((await repo.loadLibrary("local")).get(FOX.isbn).shelf).toBe(Shelf.WANTED);
});

test("blank giver leaves the saved book wanted", async () => {
  const { repo, scan, move } = stack();
  await scan.execute("local", FOX.isbn, Shelf.WANTED);
  await expect(
    move.execute("local", FOX.isbn, Shelf.OWNED, new Gift("   ")),
  ).rejects.toBeInstanceOf(GiftSourceRequiredError);
  expect((await repo.loadLibrary("local")).get(FOX.isbn).shelf).toBe(Shelf.WANTED);
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
  await scan.execute("local", FOX.isbn, Shelf.OWNED, ReadingStatus.UNREAD, new Purchase());
  await remove.execute("local", FOX.isbn);
  expect((await repo.loadLibrary("local")).books).toHaveLength(0);
  await expect(remove.execute("local", FOX.isbn)).rejects.toBeInstanceOf(BookNotFoundError);
});

test("fill missing facts writes series without adding a copy", async () => {
  const repo = new MemoryBookRepository();
  await new ScanBookUseCase(
    repo,
    foxLookup({ ...FOX, series: "" }),
  ).execute("local", FOX.isbn, Shelf.OWNED, ReadingStatus.UNREAD, new Purchase());
  await new FillMissingFactsUseCase(repo, foxLookup()).execute("local");
  expect((await repo.loadLibrary("local")).get(FOX.isbn).series).toBe("Fantastic Mr Fox");
  expect((await repo.loadLibrary("local")).get(FOX.isbn).copyCount).toBe(1);
});

test("scan keeps the owner's chosen cover and binding", async () => {
  const { repo, scan } = stack();
  await scan.execute("local", FOX.isbn, Shelf.WANTED, ReadingStatus.UNREAD, undefined, {
    coverUrl: MY_PHOTO,
    format: BookFormat.HARDCOVER,
  });
  const saved = (await repo.loadLibrary("local")).get(FOX.isbn);
  expect(saved.coverUrl).toBe(MY_PHOTO);
  expect(saved.format).toBe(BookFormat.HARDCOVER);
});

test("scan without choices uses the sources' best cover and binding", async () => {
  const { scan } = stack();
  const book = await scan.execute("local", FOX.isbn, Shelf.WANTED);
  expect(book.coverUrl).toBe(FOX.coverUrl);
  expect(book.format).toBe(BookFormat.PAPERBACK);
});

test("change cover replaces the saved cover", async () => {
  const { repo, scan, changeCover } = memoryStack();
  await scan.execute("local", FOX.isbn, Shelf.WANTED);
  await changeCover.execute("local", FOX.isbn, "data:image/jpeg;base64,NEW");
  expect((await repo.loadLibrary("local")).get(FOX.isbn).coverUrl).toBe("data:image/jpeg;base64,NEW");
});

test("fill missing facts also fills an unknown binding", async () => {
  const repo = new MemoryBookRepository();
  await new ScanBookUseCase(repo, foxLookup({ ...FOX, format: BookFormat.UNKNOWN })).execute(
    "local",
    FOX.isbn,
    Shelf.WANTED,
  );
  await new FillMissingFactsUseCase(repo, foxLookup()).execute("local");
  expect((await repo.loadLibrary("local")).get(FOX.isbn).format).toBe(BookFormat.PAPERBACK);
});
