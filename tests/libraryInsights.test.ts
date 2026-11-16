/**
 * Tests: the Account tab's highlights (LibraryInsights: pages read, top genres,
 * gifts, latest addition), readable subjects on a book's page, and correcting
 * how an Owned book was acquired (the domain rule, the use case, and the popups).
 */
import { MemoryBookRepository } from "../data/bookRepository";
import { Book, Gift, PersonalLibrary, Purchase, ReadingStatus, Shelf } from "../domain";
import { NotOwnedError } from "../domain/exceptions";
import { Labels } from "../presentation/model/labels";
import { LibraryAppModel } from "../presentation/model/libraryAppModel";
import { LibraryView } from "../presentation/model/libraryController";
import { LibraryInsights } from "../presentation/model/libraryInsights";
import { UseCases } from "../service";
import { FOX, FakeDevices, controllerFor, foxLookup } from "./fixtures";

const book = (isbn: string, props: Partial<ConstructorParameters<typeof Book>[0]> = {}) =>
  new Book({ ...FOX, isbn, shelf: Shelf.OWNED, acquisition: new Purchase(), ...props });

describe("Labels.subjectList", () => {
  test("drops catalog tags, turns underscores into spaces, and removes repeats", () => {
    expect(
      Labels.subjectList("Serie:Once_Upon_a_Broken_Heart, Fantasy, Fantasy_fiction, fantasy, nyt:young-adult, , Romance"),
    ).toEqual(["Fantasy", "Fantasy fiction", "Romance"]);
  });
});

test("a book's details end with the day it was added (none before it is first saved)", () => {
  const added = Date.UTC(2026, 10, 15, 17);
  const facts = Labels.facts(book("1", { addedAt: added }));
  expect(facts[facts.length - 1]).toEqual({ label: "Added", value: Labels.day(added) });
  expect(Labels.facts(book("2")).map((fact) => fact.label)).not.toContain("Added");
});

describe("LibraryInsights", () => {
  const view = new LibraryView(
    new PersonalLibrary([
      book("1", { pageCount: 300, readingStatus: ReadingStatus.READ, subjects: "Fiction / Fantasy / General, Romance", addedAt: 10 }),
      book("2", { pageCount: 200, subjects: "Fantasy fiction, Fiction / Fantasy / Epic", acquisition: new Gift("Ellie"), addedAt: 30 }),
      book("3", { pageCount: 0, subjects: "Accessible book, Romance", acquisition: new Gift("ellie "), addedAt: 20 }),
      book("4", { shelf: Shelf.WANTED, acquisition: null, pageCount: 900, subjects: "Mystery", addedAt: 40 }),
    ]),
  );
  const insights = LibraryInsights.of(view);

  test("pages read count the owned shelf only", () => {
    expect(insights.pages).toEqual({ read: 300, total: 500 });
  });

  test("top genres: each source's style read the same way, catalog tags skipped, a book counted once", () => {
    expect(insights.genres).toEqual(["Fantasy", "Romance", "Fantasy fiction"]);
  });

  test("gifts on the owned shelf, and who gave the most (names matched without case)", () => {
    expect(insights.gifts).toEqual({ count: 2, topGiver: "Ellie" });
  });

  test("the latest addition is the newest added date on either shelf", () => {
    expect(insights.latest?.isbn).toBe("4");
  });
});

describe("Correcting how a book was acquired", () => {
  test("only an Owned book records it, and a gift still needs a name", async () => {
    const repository = new MemoryBookRepository();
    const useCases = new UseCases(repository, foxLookup());
    await repository.save("local", book(FOX.isbn, { acquisition: new Gift("Elie") }));

    const fixed = await useCases.changeAcquisition.execute("local", FOX.isbn, new Gift("Ellie"));
    expect(fixed.giftedBy).toBe("Ellie");
    await expect(useCases.changeAcquisition.execute("local", FOX.isbn, new Gift(" "))).rejects.toThrow("needs the name");

    expect(() => book("9", { shelf: Shelf.WANTED, acquisition: null }).changeAcquisition(new Purchase())).toThrow(NotOwnedError);
  });

  test("from the book's page: the giver's name is filled in to fix, then saved", async () => {
    const repository = new MemoryBookRepository();
    await repository.save("local", book(FOX.isbn, { acquisition: new Gift("Elie") }));
    const model = new LibraryAppModel(async () => controllerFor(repository), new FakeDevices());
    await model.start();
    model.openBook(model.getState().view.owned[0]);

    model.editAcquisition();
    expect(model.getState().prompt?.kind).toBe("acquire");
    expect(model.getState().giftName).toBe("Elie");
    model.chooseGifted();
    model.setGiftName("Ellie");
    model.continueGift();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(model.selected?.giftedBy).toBe("Ellie");
    expect(model.getState().flash?.text).toBe("Saved: Gifted by Ellie.");

    model.showGifts(); // the Account tab's Gifts line
    expect(model.getState()).toMatchObject({ tab: "owned", catalogMode: "gifts", screen: "main" });
    model.openBook(model.getState().view.owned[0]);

    model.editAcquisition();
    model.choosePurchased();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(model.selected?.acquisition).toBeInstanceOf(Purchase);
    model.dispose();
  });
});
