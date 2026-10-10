/**
 * Tests: Presentation LibraryController / LibraryView against memory/fake Data,
 * plus the JSON adapter round-tripping a Gift through storage.
 */
import { Gift, Purchase, ReadingStatus, Shelf } from "../domain";
import { JsonBookRepository, MemoryBookRepository } from "../data/bookRepository";
import { LibraryView } from "../presentation/model/libraryController";
import {
  DeleteBookUseCase,
  FillMissingFactsUseCase,
  LibraryUseCase,
  LoadLibraryUseCase,
  MoveBookToShelfUseCase,
  ScanBookUseCase,
  SetReadingStatusUseCase,
} from "../service";
import { FOX, controllerFor, foxLookup } from "./fixtures";

test("every library use case shares the LibraryUseCase base", () => {
  const repository = new MemoryBookRepository();
  const lookup = foxLookup();
  [
    new LoadLibraryUseCase(repository),
    new ScanBookUseCase(repository, lookup),
    new MoveBookToShelfUseCase(repository),
    new SetReadingStatusUseCase(repository),
    new DeleteBookUseCase(repository),
    new FillMissingFactsUseCase(repository, lookup),
  ].forEach((useCase) => expect(useCase).toBeInstanceOf(LibraryUseCase));
});

test("lookup reports whether the isbn is already cataloged", async () => {
  const library = controllerFor(new MemoryBookRepository());
  expect((await library.lookup("978-0140328721")).alreadyInLibrary).toBe(false);
  await library.scan(FOX, Shelf.WANTED, ReadingStatus.UNREAD);
  expect((await library.lookup(FOX.isbn)).alreadyInLibrary).toBe(true);
});

test("view splits owned into to-be-read by reading status", async () => {
  const library = controllerFor(new MemoryBookRepository());
  await library.scan(FOX, Shelf.OWNED, ReadingStatus.READ, new Purchase());
  const view = await library.view();
  expect(view.owned).toHaveLength(1);
  expect(view.wanted).toHaveLength(0);
  expect(view.toBeRead(ReadingStatus.UNREAD)).toHaveLength(0);
  expect(view.toBeRead(ReadingStatus.READ)[0].isbn).toBe(FOX.isbn);
  expect(view.find(FOX.isbn)?.title).toBe("Fantastic Mr. Fox");
  expect(view.find("missing")).toBeNull();
  expect(view.find(null)).toBeNull();
});

test("move sets the shelf and the reading status together", async () => {
  const library = controllerFor(new MemoryBookRepository());
  await library.scan(FOX, Shelf.WANTED, ReadingStatus.UNREAD);
  const book = await library.move(FOX.isbn, Shelf.OWNED, ReadingStatus.READ, new Gift("Sam"));
  expect(book.shelf).toBe(Shelf.OWNED);
  expect(book.readingStatus).toBe(ReadingStatus.READ);
  expect(book.acquisition?.describe()).toBe("Gifted by Sam");
});

test("empty view has no books", () => {
  const view = LibraryView.empty();
  expect(view.owned).toEqual([]);
  expect(view.toBeRead(ReadingStatus.UNREAD)).toEqual([]);
});

test("json storage round-trips a gift as a Gift", async () => {
  const store: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
  };
  await controllerFor(new JsonBookRepository(storage)).scan(
    FOX,
    Shelf.OWNED,
    ReadingStatus.UNREAD,
    new Gift("Grandma"),
  );
  const reloaded = (await controllerFor(new JsonBookRepository(storage)).view()).find(FOX.isbn);
  expect(reloaded?.acquisition).toBeInstanceOf(Gift);
  expect(reloaded?.giftedBy).toBe("Grandma");
});
