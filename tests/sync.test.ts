/**
 * Tests: SyncLibraryUseCase (core feature 4, ADR-012). Two phones are two memory
 * stores with their own clocks; the account backup is a fake shared by both.
 * Covers merging, latest change wins, deletes that stay deleted, working
 * offline, and moving the phone's library into the account on first sign-in.
 */
import { MemoryBookRepository } from "../data/bookRepository";
import { Book, Purchase, ReadingStatus, Shelf } from "../domain";
import { BookVersion, LibraryBackup, SyncUnavailableError } from "../service/ports";
import { SyncLibraryUseCase } from "../service/syncLibrary";
import { FOX } from "./fixtures";

const ACCOUNT = "user-1";
const MATILDA = { ...FOX, isbn: "9780142410370", title: "Matilda" };

/** The account's backup in memory; `offline` makes every call fail like a dropped connection. */
class FakeBackup implements LibraryBackup {
  private readonly versions = new Map<string, BookVersion[]>();
  offline = false;

  async pull(ownerId: string): Promise<BookVersion[]> {
    this.reach();
    return [...(this.versions.get(ownerId) ?? [])];
  }

  async push(ownerId: string, versions: BookVersion[]): Promise<void> {
    this.reach();
    const kept = (this.versions.get(ownerId) ?? []).filter(
      (stored) => !versions.some((version) => version.book.isbn === stored.book.isbn),
    );
    this.versions.set(ownerId, [...kept, ...versions]);
  }

  private reach(): void {
    if (this.offline) {
      throw new SyncUnavailableError("offline");
    }
  }
}

/** One phone: its own store and clock, syncing to the shared backup. */
class Phone {
  private now = 0;
  readonly store = new MemoryBookRepository(() => this.now);
  readonly sync: SyncLibraryUseCase;

  constructor(backup: LibraryBackup) {
    this.sync = new SyncLibraryUseCase(this.store, this.store, backup);
  }

  at(time: number): this {
    this.now = time;
    return this;
  }

  async titles(ownerId = ACCOUNT): Promise<string[]> {
    return (await this.store.loadLibrary(ownerId)).books.map((book) => book.title).sort();
  }
}

const owned = (metadata = FOX) => new Book({ ...metadata, shelf: Shelf.OWNED, acquisition: new Purchase() });

describe("SyncLibraryUseCase", () => {
  test("books added on two phones end up on both", async () => {
    const backup = new FakeBackup();
    const [phoneA, phoneB] = [new Phone(backup), new Phone(backup)];
    await phoneA.at(10).store.save(ACCOUNT, owned(FOX));
    await phoneB.at(20).store.save(ACCOUNT, owned(MATILDA));

    expect(await phoneA.sync.execute(ACCOUNT)).toEqual({ downloaded: 0, uploaded: 1 });
    expect(await phoneB.sync.execute(ACCOUNT)).toEqual({ downloaded: 1, uploaded: 1 });
    expect(await phoneA.sync.execute(ACCOUNT)).toEqual({ downloaded: 1, uploaded: 0 });

    expect(await phoneA.titles()).toEqual(["Fantastic Mr. Fox", "Matilda"]);
    expect(await phoneB.titles()).toEqual(["Fantastic Mr. Fox", "Matilda"]);
    expect(await phoneA.sync.execute(ACCOUNT)).toEqual({ downloaded: 0, uploaded: 0 }); // already in step
  });

  test("the latest change to a book wins, whichever phone made it", async () => {
    const backup = new FakeBackup();
    const [phoneA, phoneB] = [new Phone(backup), new Phone(backup)];
    await phoneA.at(10).store.save(ACCOUNT, owned());
    await phoneA.sync.execute(ACCOUNT);
    await phoneB.sync.execute(ACCOUNT);

    const readOnB = (await phoneB.store.loadLibrary(ACCOUNT)).get(FOX.isbn);
    readOnB.setReadingStatus(ReadingStatus.READ);
    await phoneB.at(30).store.save(ACCOUNT, readOnB); // newer
    const twoCopiesOnA = (await phoneA.store.loadLibrary(ACCOUNT)).get(FOX.isbn);
    twoCopiesOnA.addCopy();
    await phoneA.at(20).store.save(ACCOUNT, twoCopiesOnA); // older

    await phoneA.sync.execute(ACCOUNT);
    await phoneB.sync.execute(ACCOUNT);
    await phoneA.sync.execute(ACCOUNT);
    for (const phone of [phoneA, phoneB]) {
      expect((await phone.store.loadLibrary(ACCOUNT)).get(FOX.isbn)).toMatchObject({ readingStatus: ReadingStatus.READ, copyCount: 1 });
    }
  });

  test("a book deleted on one phone is deleted on the other and doesn't come back", async () => {
    const backup = new FakeBackup();
    const [phoneA, phoneB] = [new Phone(backup), new Phone(backup)];
    await phoneA.at(10).store.save(ACCOUNT, owned());
    await phoneA.sync.execute(ACCOUNT);
    await phoneB.sync.execute(ACCOUNT);

    await phoneA.at(20).store.delete(ACCOUNT, FOX.isbn);
    await phoneA.sync.execute(ACCOUNT);
    await phoneB.sync.execute(ACCOUNT);
    await phoneB.sync.execute(ACCOUNT);
    expect(await phoneB.titles()).toEqual([]);
    expect(await phoneA.titles()).toEqual([]);
  });

  test("offline: the phone keeps working, and the next sync catches up", async () => {
    const backup = new FakeBackup();
    const phone = new Phone(backup);
    backup.offline = true;
    await phone.at(10).store.save(ACCOUNT, owned());
    await expect(phone.sync.execute(ACCOUNT)).rejects.toBeInstanceOf(SyncUnavailableError);
    expect(await phone.titles()).toEqual(["Fantastic Mr. Fox"]);

    backup.offline = false;
    expect(await phone.sync.execute(ACCOUNT)).toEqual({ downloaded: 0, uploaded: 1 });
    expect(await new Phone(backup).sync.execute(ACCOUNT)).toEqual({ downloaded: 1, uploaded: 0 });
  });

  test("first sign-in moves the phone's books into the account; a book in both adds its copies", async () => {
    const backup = new FakeBackup();
    const [phoneA, phoneB] = [new Phone(backup), new Phone(backup)];
    await phoneA.at(10).store.save(ACCOUNT, owned(FOX));
    await phoneA.sync.execute(ACCOUNT);

    await phoneB.at(20).store.save("local", owned(FOX));
    await phoneB.store.save("local", owned(MATILDA));
    await phoneB.at(30).sync.signedIn(ACCOUNT, "local");

    expect(await phoneB.titles("local")).toEqual([]);
    expect(await phoneB.titles()).toEqual(["Fantastic Mr. Fox", "Matilda"]);
    expect((await phoneB.store.loadLibrary(ACCOUNT)).get(FOX.isbn).copyCount).toBe(2);

    await phoneA.sync.execute(ACCOUNT);
    expect((await phoneA.store.loadLibrary(ACCOUNT)).books.map((book) => [book.title, book.copyCount])).toEqual([
      ["Fantastic Mr. Fox", 2],
      ["Matilda", 1],
    ]);
  });

  test("each account syncs only its own books", async () => {
    const backup = new FakeBackup();
    const phone = new Phone(backup);
    await phone.at(10).store.save(ACCOUNT, owned(FOX));
    await phone.store.save("user-2", owned(MATILDA));
    await phone.sync.execute(ACCOUNT);
    expect((await backup.pull(ACCOUNT)).map((version) => version.book.title)).toEqual(["Fantastic Mr. Fox"]);
    expect(await backup.pull("user-2")).toEqual([]);
  });
});
