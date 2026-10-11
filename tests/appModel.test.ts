/**
 * Tests: the presentation view model (LibraryAppModel) driven like a user
 * would, with no React — plus AlphabetRail, Labels, and Observable.
 */
import { Book, BookFormat, ReadingStatus, Shelf } from "../domain";
import { AlphabetRail } from "../presentation/model/alphabetRail";
import { Catalog } from "../presentation/model/catalog";
import { CameraUnavailableError } from "../presentation/model/coverCamera";
import { Labels } from "../presentation/model/labels";
import { LibraryAppModel } from "../presentation/model/libraryAppModel";
import { ScanDraft } from "../presentation/model/scanDraft";
import { FOX, FakeCoverCamera, MY_PHOTO, controllerFor } from "./fixtures";

let model: LibraryAppModel;

beforeEach(async () => {
  model = new LibraryAppModel(async () => controllerFor(), new FakeCoverCamera());
  await model.start();
});

afterEach(() => model.dispose());

const prompt = () => model.getState().prompt;
// Let fire-and-forget saves (started by a popup button) finish.
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

test("starts ready on the empty TBR tab", () => {
  expect(model.getState().ready).toBe(true);
  expect(model.heading).toBe("To be read");
  expect(model.hint).toBe("Owned books waiting to be read.");
});

test("scan into Owned walks confirm → shelf → gift → name → reading, then saves", async () => {
  await model.scan(FOX.isbn);
  expect(prompt()?.kind).toBe("scanConfirm");
  model.confirmScan();
  expect(prompt()?.kind).toBe("scanShelf");
  model.chooseScanShelf(Shelf.OWNED);
  expect(prompt()?.kind).toBe("acquire");
  model.chooseGifted();
  expect(prompt()?.kind).toBe("giftName");

  model.continueGift(); // no name yet: the popup stays open
  expect(prompt()?.kind).toBe("giftName");

  model.setGiftName("Grandma");
  model.continueGift();
  expect(prompt()?.kind).toBe("reading");
  model.chooseReading(ReadingStatus.UNREAD);
  await settle();

  const state = model.getState();
  expect(state.prompt).toBeNull();
  expect(state.tab).toBe("tbr");
  expect(state.view.owned[0].giftedBy).toBe("Grandma");
  expect(state.flash?.text).toBe("Added Fantastic Mr. Fox to Owned (unread).");
});

test("scan into Wanted skips the purchased / gifted question", async () => {
  await model.scan(FOX.isbn);
  model.confirmScan();
  model.chooseScanShelf(Shelf.WANTED);
  expect(prompt()?.kind).toBe("reading");
});

test("cancelling a scan popup adds nothing", async () => {
  await model.scan(FOX.isbn);
  model.cancelPrompt();
  expect(prompt()).toBeNull();
  expect(model.getState().flash?.text).toBe("Nothing added.");
  expect(model.getState().view.owned).toHaveLength(0);
});

test("an unknown ISBN shows the domain error as an info flash", async () => {
  await model.scan("0000000000");
  expect(prompt()).toBeNull();
  expect(model.getState().flash?.tone).toBe("info");
});

test("Wanted → Owned asks how it was acquired, then moves it", async () => {
  await model.scan(FOX.isbn);
  model.confirmScan();
  model.chooseScanShelf(Shelf.WANTED);
  model.chooseReading(ReadingStatus.UNREAD);
  await settle();

  model.openBook(model.getState().view.wanted[0]);
  expect(model.heading).toBe("Fantastic Mr. Fox");
  model.moveSelected(Shelf.OWNED);
  expect(prompt()?.kind).toBe("acquire");
  model.choosePurchased();
  model.chooseReading(ReadingStatus.READ);
  await settle();

  expect(model.getState().tab).toBe("owned");
  expect(model.getState().view.owned[0].acquisition?.describe()).toBe("Purchased");
});

test("cancel backs out of any choice popup without changing anything", async () => {
  // Scan: cancelling at the purchased / gifted step adds nothing.
  await model.scan(FOX.isbn);
  model.confirmScan();
  model.chooseScanShelf(Shelf.OWNED);
  model.cancelPrompt();
  expect(prompt()).toBeNull();
  expect(model.getState().flash?.text).toBe("Nothing added.");
  expect(model.getState().view.owned).toHaveLength(0);

  // Move: cancelling at the read / unread step leaves the book on Wanted.
  await model.scan(FOX.isbn);
  model.confirmScan();
  model.chooseScanShelf(Shelf.WANTED);
  model.chooseReading(ReadingStatus.UNREAD);
  await settle();
  model.openBook(model.getState().view.wanted[0]);
  model.moveSelected(Shelf.OWNED);
  model.choosePurchased();
  model.cancelPrompt();
  expect(prompt()).toBeNull();
  expect(model.getState().view.wanted).toHaveLength(1);
  expect(model.getState().view.wanted[0].acquisition).toBeNull();
});

test("delete asks first, then removes the book", async () => {
  await model.scan(FOX.isbn);
  model.confirmScan();
  model.chooseScanShelf(Shelf.WANTED);
  model.chooseReading(ReadingStatus.UNREAD);
  await settle();
  model.openBook(model.getState().view.wanted[0]);

  model.askDelete();
  expect(prompt()?.kind).toBe("delete");
  await model.confirmDelete();
  expect(model.getState().view.wanted).toHaveLength(0);
  expect(model.getState().screen).toBe("main");
});

test("subscribers hear every state change", () => {
  const heard: string[] = [];
  const unsubscribe = model.subscribe(() => heard.push(model.getState().tab));
  model.selectTab("scan");
  model.selectTab("owned");
  unsubscribe();
  model.selectTab("wanted");
  expect(heard).toEqual(["scan", "owned"]);
});

test("Labels word counts and statuses", () => {
  expect(Labels.count(1, "title")).toBe("1 title");
  expect(Labels.count(2, "copy", "copies")).toBe("2 copies");
  expect(Labels.shelf(Shelf.WANTED)).toBe("Wanted");
  expect(Labels.reading(ReadingStatus.READ)).toBe("read");
  expect(Labels.readingTitle(ReadingStatus.UNREAD)).toBe("Unread");
});

test("AlphabetRail maps a finger position to a letter and a section", () => {
  const book = (title: string) =>
    new Book({ isbn: title, title, author: "A", coverUrl: "", publisher: "", shelf: Shelf.WANTED });
  const sections = Catalog.sections([book("Apple"), book("Banana"), book("Dune")], "az");
  const rail = new AlphabetRail();
  rail.measure(0, 270); // 27 letters, 10px each
  expect(rail.letterAt(5)).toBe("A");
  expect(rail.letterAt(25)).toBe("C");
  expect(rail.letterAt(9999)).toBe("#");
  expect(rail.centerOf("A")).toBe(5);
  expect(AlphabetRail.sectionFor("C", sections)).toBe(1); // no C books: lands on B
  expect([...AlphabetRail.lettersIn(sections)]).toEqual(["A", "B", "D"]);
});

test("AlphabetRail jumps by author and by series too", () => {
  const book = (title: string, author: string, series: string) =>
    new Book({ isbn: title, title, author, series, coverUrl: "", publisher: "", shelf: Shelf.WANTED });
  const books = [
    book("Dune", "Frank Herbert", "Dune"),
    book("Emma", "Jane Austen", ""),
    book("It", "Stephen King", ""),
    book("Neuromancer", "William Gibson", "Sprawl"),
  ];
  const authors = Catalog.sections(books, "author"); // Frank, Jane, Stephen, William
  expect(AlphabetRail.sectionFor("J", authors)).toBe(1);
  expect(AlphabetRail.sectionFor("T", authors)).toBe(2); // nothing at T: stays on Stephen
  const series = Catalog.sections(books, "series"); // Dune, Sprawl, Standalone
  expect([...AlphabetRail.lettersIn(series)]).toEqual(["D", "S"]);
  expect(AlphabetRail.sectionFor("S", series)).toBe(1); // first S section: Sprawl, not Standalone
});

test("the confirm popup offers every cover and the owner's photo; the pick is saved", async () => {
  await model.scan(FOX.isbn);
  const draft = () => (prompt()?.kind === "scanConfirm" ? (prompt() as { draft: ScanDraft }).draft : null);
  expect(draft()?.covers).toEqual(FOX.coverCandidates);
  expect(draft()?.cover).toBe(FOX.coverCandidates[0]);

  model.selectCover(FOX.coverCandidates[1]);
  expect(draft()?.cover).toBe(FOX.coverCandidates[1]);
  await model.photographScanCover();
  expect(draft()?.cover).toBe(MY_PHOTO);

  model.confirmScan();
  model.chooseScanShelf(Shelf.WANTED);
  model.chooseReading(ReadingStatus.UNREAD);
  await settle();
  expect(model.getState().view.wanted[0].coverUrl).toBe(MY_PHOTO);
});

test("when no source knows the binding, the owner is asked hardcover or paperback", async () => {
  const unknownBinding = new LibraryAppModel(
    async () => controllerFor(undefined, { ...FOX, format: BookFormat.UNKNOWN }),
    new FakeCoverCamera(),
  );
  await unknownBinding.start();
  await unknownBinding.scan(FOX.isbn);
  unknownBinding.confirmScan();
  expect(unknownBinding.getState().prompt?.kind).toBe("format");
  unknownBinding.chooseFormat(BookFormat.HARDCOVER);
  expect(unknownBinding.getState().prompt?.kind).toBe("scanShelf");
  unknownBinding.chooseScanShelf(Shelf.WANTED);
  unknownBinding.chooseReading(ReadingStatus.UNREAD);
  await settle();
  expect(unknownBinding.getState().view.wanted[0].format).toBe(BookFormat.HARDCOVER);
  unknownBinding.dispose();
});

test("a known binding skips the question", async () => {
  await model.scan(FOX.isbn);
  model.confirmScan();
  expect(prompt()?.kind).toBe("scanShelf");
});

test("change cover on the detail screen saves the photo", async () => {
  await model.scan(FOX.isbn);
  model.confirmScan();
  model.chooseScanShelf(Shelf.WANTED);
  model.chooseReading(ReadingStatus.UNREAD);
  await settle();
  model.openBook(model.getState().view.wanted[0]);
  await model.changeCover();
  expect(model.selected?.coverUrl).toBe(MY_PHOTO);
  expect(model.getState().flash?.text).toBe("Cover updated.");
});

test("a refused camera explains itself and changes nothing", async () => {
  const refused = new LibraryAppModel(async () => controllerFor(), {
    takePhoto: async () => {
      throw new CameraUnavailableError("Allow camera access to photograph your cover.");
    },
  });
  await refused.start();
  await refused.scan(FOX.isbn);
  await refused.photographScanCover();
  expect(refused.getState().flash).toEqual({
    text: "Allow camera access to photograph your cover.",
    tone: "danger",
  });
  expect(refused.getState().prompt?.kind).toBe("scanConfirm");
  refused.dispose();
});
