/**
 * Tests: the Account screen's view model (AccountModel) together with
 * LibraryAppModel, driven like a person would, with no React or network:
 * sign up, sign in, wrong passwords, signing out, a
 * session that ends on its own, syncing after a change, books arriving from
 * another phone, and an app with no Supabase settings.
 */
import { MemoryBookRepository } from "../data/bookRepository";
import { UnconfiguredAccounts } from "../data/supabaseAccounts";
import { UnconfiguredLibraryBackup } from "../data/supabaseBackup";
import { Book, BookFormat, Purchase, ReadingStatus, Shelf } from "../domain";
import { AccountUseCases, UseCases } from "../service";
import { Accounts, LibraryBackup } from "../service/ports";
import { AccountModel } from "../presentation/model/accountModel";
import { LibraryAppModel } from "../presentation/model/libraryAppModel";
import { Labels } from "../presentation/model/labels";
import { LibraryController } from "../presentation/model/libraryController";
import { FOX, FakeAccounts, FakeBackup, FakeDevices, foxLookup } from "./fixtures";

const MATILDA = { ...FOX, isbn: "9780142410370", title: "Matilda" };
const owned = (metadata = FOX) => new Book({ ...metadata, shelf: Shelf.OWNED, acquisition: new Purchase() });
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const titles = (app: LibraryAppModel) => app.getState().view.owned.map((book) => book.title).sort();

/** One phone running the app: its store, the account model and the library model. */
async function phone(
  accounts: Accounts = new FakeAccounts(),
  backup: LibraryBackup = new FakeBackup(),
  clock: () => number = Date.now,
) {
  const store = new MemoryBookRepository(clock);
  const account = new AccountModel(async () => new AccountUseCases(accounts, store, store, backup));
  const app = new LibraryAppModel(
    async () => new LibraryController(new UseCases(store, foxLookup()), "local"),
    new FakeDevices(),
    account,
  );
  await app.start();
  return { store, account, app };
}

async function signIn(account: AccountModel, password = "correct horse") {
  account.setEmail("grace@example.com");
  account.setPassword(password);
  await account.submit();
}

describe("Account tab", () => {
  test("signing in moves the phone's books into the account and shows them", async () => {
    const { store, account, app } = await phone();
    await store.save("local", owned());
    app.selectTab("account");
    expect(app.heading).toBe("Account");
    expect(app.hint).toBe("Sign in to keep your library on all your phones.");

    await signIn(account);
    expect(account.getState()).toMatchObject({ account: { id: "user-1" }, sync: "synced", password: "" });
    expect(account.getState().notice?.text).toBe("Signed in as grace@example.com.");
    expect(app.hint).toBe("Your library is up to date.");
    expect(titles(app)).toEqual(["Fantastic Mr. Fox"]);
    expect((await store.loadLibrary("local")).books).toHaveLength(0);
  });

  test("signed in, the Account tab shows the library's counts, the email, member since and when it last synced", async () => {
    const { store, account, app } = await phone();
    expect(app.accountDetails).toEqual([]);
    await store.save("local", owned());
    await store.save("local", new Book({ ...MATILDA, shelf: Shelf.WANTED }));
    await signIn(account);
    await settle();
    const details = Object.fromEntries(app.accountDetails.map((detail) => [detail.label, detail.value]));
    expect(details).toMatchObject({ Email: "grace@example.com" });
    expect(app.libraryStats).toEqual([
      { label: "Owned", count: 1 },
      { label: "To read", count: 1 },
      { label: "Read", count: 0 },
      { label: "Wanted", count: 1 },
    ]);
    expect(details["Member since"]).toBe(Labels.day(FakeAccounts.CREATED));
    expect(details["Last synced"]).toMatch(/^Today at /);

    await account.signOut();
    expect(app.accountDetails).toEqual([]);
  });

  test("a regular check catches a change whose Realtime notice never arrived", async () => {
    const backup = new FakeBackup();
    const accounts = new FakeAccounts();
    const phoneA = await phone(accounts, backup);
    const phoneB = await phone(accounts, backup);
    await signIn(phoneA.account);
    await signIn(phoneB.account);
    phoneB.account.dispose(); // phone B's Realtime connection is gone
    const stop = phoneB.account.syncEvery(50);

    await phoneA.store.save("user-1", owned(MATILDA));
    await phoneA.account.sync();
    expect(titles(phoneB.app)).toEqual([]);
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(titles(phoneB.app)).toEqual(["Matilda"]);
    stop();
  });

  test("opening the app signed out starts on the Account tab; signed in, it starts on To be read", async () => {
    const accounts = new FakeAccounts();
    const signedOut = await phone(accounts);
    expect(signedOut.app.getState().tab).toBe("account");
    await signIn(signedOut.account);
    const signedIn = await phone(accounts);
    expect(signedIn.app.getState().tab).toBe("tbr");
  });

  test("signed out, every shelf is empty and scanning is refused until someone signs in", async () => {
    const { store, account, app } = await phone();
    await store.save("local", owned()); // a book kept from before accounts
    app.selectTab("tbr");
    expect(app.locked).toBe(true);
    expect(app.getState().view.owned).toHaveLength(0);
    expect(app.hint).toBe("Sign in on the Account tab to use your library.");
    expect(app.cameraListening).toBe(false);

    await app.scan(FOX.isbn);
    expect(app.getState().prompt).toBeNull();
    expect(app.getState().flash?.text).toBe("Sign in on the Account tab to add books.");

    await signIn(account);
    await settle();
    expect(app.locked).toBe(false);
    expect(titles(app)).toEqual(["Fantastic Mr. Fox"]);
    await app.scan(FOX.isbn);
    expect(app.getState().prompt?.kind).toBe("scanConfirm");
  });

  test("a wrong password or a bad email is explained, and nobody is signed in", async () => {
    const { account } = await phone();
    await signIn(account, "wrong password");
    expect(account.getState().notice).toEqual({ text: "That email and password don't match an account.", tone: "info" });
    account.setEmail("grace");
    await account.submit();
    expect(account.getState().notice?.text).toBe("Enter a valid email address.");
    expect(account.getState()).toMatchObject({ account: null, busy: false });
  });

  test("sign-up with email confirmation asks the person to confirm, then sign in", async () => {
    const accounts = new FakeAccounts();
    accounts.confirmEmail = true;
    const { account } = await phone(accounts);
    account.showForm("signUp");
    expect(account.submitLabel).toBe("Create account");
    await signIn(account);
    expect(account.getState()).toMatchObject({ form: "signIn", account: null });
    expect(account.getState().notice?.text).toBe("Check your email and confirm your account, then sign in here.");
  });

  test("signing out, or a session ending on its own, shows this phone's own library again", async () => {
    const accounts = new FakeAccounts();
    const { account, app } = await phone(accounts);
    await signIn(account);
    await app.scan(FOX.isbn);
    app.confirmScan();
    app.chooseScanShelf(Shelf.OWNED);
    app.choosePurchased();
    app.chooseReading(ReadingStatus.UNREAD);
    await settle();
    expect(titles(app)).toEqual(["Fantastic Mr. Fox"]);

    await account.signOut();
    await settle();
    expect(account.getState()).toMatchObject({ account: null, sync: "off" });
    expect(titles(app)).toEqual([]);

    await signIn(account);
    await settle();
    expect(titles(app)).toEqual(["Fantastic Mr. Fox"]);
    accounts.expire();
    await settle();
    expect(titles(app)).toEqual([]);
  });

  test("a change to the library is synced, and books from another phone appear", async () => {
    const backup = new FakeBackup();
    const phoneA = await phone(new FakeAccounts(), backup);
    const phoneB = await phone(new FakeAccounts(), backup);
    await signIn(phoneA.account);
    await signIn(phoneB.account);

    await phoneA.app.scan(FOX.isbn);
    phoneA.app.confirmScan();
    phoneA.app.chooseScanShelf(Shelf.OWNED);
    phoneA.app.choosePurchased();
    phoneA.app.chooseReading(ReadingStatus.UNREAD);
    await settle();
    await settle();
    expect((await backup.stored("user-1")).map((version) => version.book.title)).toEqual(["Fantastic Mr. Fox"]);

    await phoneB.account.sync();
    await settle();
    expect(titles(phoneB.app)).toEqual(["Fantastic Mr. Fox"]);
  });

  test("auto sync: a book added on one phone appears on the other with no tap", async () => {
    const backup = new FakeBackup();
    const phoneA = await phone(new FakeAccounts(), backup);
    const phoneB = await phone(new FakeAccounts(), backup);
    await signIn(phoneA.account);
    await signIn(phoneB.account);

    await phoneA.app.scan(FOX.isbn);
    phoneA.app.confirmScan();
    phoneA.app.chooseScanShelf(Shelf.OWNED);
    phoneA.app.choosePurchased();
    phoneA.app.chooseReading(ReadingStatus.UNREAD);
    for (let i = 0; i < 5; i += 1) {
      await settle();
    }
    expect(titles(phoneB.app)).toEqual(["Fantastic Mr. Fox"]);

    await phoneB.account.signOut(); // a signed-out phone stops listening
    await phoneA.store.save("user-1", owned(MATILDA));
    await phoneA.account.sync();
    await settle();
    expect((await phoneB.store.loadLibrary("user-1")).books.map((book) => book.title)).toEqual(["Fantastic Mr. Fox"]);
  });

  test("offline: signing in still works on this phone, and sync waits", async () => {
    const backup = new FakeBackup();
    const { store, account, app } = await phone(new FakeAccounts(), backup);
    await store.save("local", owned(MATILDA));
    backup.offline = true;
    await signIn(account);
    expect(account.getState()).toMatchObject({ account: { id: "user-1" }, sync: "waiting" });
    expect(account.hint).toBe("Saved on this phone. It will sync when you're back online.");
    expect(titles(app)).toEqual(["Matilda"]);

    backup.offline = false;
    await account.sync();
    expect(account.getState().sync).toBe("synced");
    expect(await backup.stored("user-1")).toHaveLength(1);
  });

  test("opening the app syncs before filling in missing facts, so it can't revive a book deleted elsewhere", async () => {
    const backup = new FakeBackup();
    const accounts = new FakeAccounts();
    // One clock that moves on every reading, so each change is newer than the last.
    let now = 1000;
    const clock = () => (now += 10);
    const phoneA = await phone(accounts, backup, clock);
    const phoneB = await phone(accounts, backup, clock);
    await signIn(phoneA.account);
    await signIn(phoneB.account);
    // A book still missing its series and binding: the backfill would fill them in and save it.
    await phoneA.store.save("user-1", new Book({ ...FOX, series: "", format: BookFormat.UNKNOWN, shelf: Shelf.OWNED, acquisition: new Purchase() }));
    await phoneA.account.sync();
    await phoneB.account.sync();
    phoneB.app.dispose(); // phone B is closed

    await phoneA.store.delete("user-1", FOX.isbn);
    await phoneA.account.sync();

    // Phone B opens again on the same store: it must hear about the delete first.
    const reopened = new LibraryAppModel(
      async () => new LibraryController(new UseCases(phoneB.store, foxLookup()), "local"),
      new FakeDevices(),
      new AccountModel(async () => new AccountUseCases(accounts, phoneB.store, phoneB.store, backup)),
    );
    await reopened.start();
    await settle();
    expect(titles(reopened)).toEqual([]);
    expect((await backup.stored("user-1")).map((version) => version.deletedAt)).not.toContain(null);
    reopened.dispose();
  });

  test("pull to refresh: a book list pulled down syncs and shows books from another phone", async () => {
    const backup = new FakeBackup();
    const accounts = new FakeAccounts();
    const phoneA = await phone(accounts, backup);
    const phoneB = await phone(accounts, backup);
    expect(phoneB.app.canRefresh).toBe(false); // signed out: nothing to sync with
    await signIn(phoneA.account);
    await signIn(phoneB.account);
    phoneB.account.dispose(); // no auto sync on phone B: only the pull brings the book

    await phoneA.store.save("user-1", owned(MATILDA));
    await phoneA.account.sync();
    expect(titles(phoneB.app)).toEqual([]);

    expect(phoneB.app.canRefresh).toBe(true);
    const pulled = phoneB.app.refresh();
    expect(phoneB.app.getState().refreshing).toBe(true);
    await pulled;
    await settle();
    expect(phoneB.app.getState().refreshing).toBe(false);
    expect(titles(phoneB.app)).toEqual(["Matilda"]);
    expect(phoneB.app.getState().flash).toBeNull();
  });

  test("pull to refresh offline: the list stays, the spinner stops, and a banner says it will sync later", async () => {
    const backup = new FakeBackup();
    const { account, app } = await phone(new FakeAccounts(), backup);
    await signIn(account);
    backup.offline = true;
    await app.refresh();
    expect(app.getState().refreshing).toBe(false);
    expect(app.getState().flash?.text).toBe(
      "Couldn't reach your account. Your books are saved on this phone and will sync later.",
    );
    app.dispose();
  });

  test("with no account service the Account tab says so, and the library stays locked", async () => {
    const { account, app } = await phone(new UnconfiguredAccounts(), new UnconfiguredLibraryBackup());
    expect(app.locked).toBe(true);
    app.selectTab("account");
    expect(account.getState().configured).toBe(false);
    expect(app.hint).toBe("Accounts aren't set up in this copy of the app.");
    await signIn(account);
    expect(account.getState().notice?.text).toBe("Accounts aren't set up in this copy of the app.");
    expect(account.ownerId).toBe("local");
  });
});
