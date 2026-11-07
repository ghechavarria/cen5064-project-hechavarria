/**
 * Tests: the Account screen's view model (AccountModel) together with
 * LibraryAppModel, driven like a person would, with no React or network:
 * sign up, sign in, wrong passwords, a forgotten password, signing out, a
 * session that ends on its own, syncing after a change, books arriving from
 * another phone, and an app with no Supabase settings.
 */
import { MemoryBookRepository } from "../data/bookRepository";
import { UnconfiguredAccounts } from "../data/supabaseAccounts";
import { UnconfiguredLibraryBackup } from "../data/supabaseBackup";
import { Book, Purchase, ReadingStatus, Shelf } from "../domain";
import { AccountUseCases, UseCases } from "../service";
import { Accounts, LibraryBackup } from "../service/ports";
import { AccountModel } from "../presentation/model/accountModel";
import { LibraryAppModel } from "../presentation/model/libraryAppModel";
import { LibraryController } from "../presentation/model/libraryController";
import { FOX, FakeAccounts, FakeBackup, FakeDevices, foxLookup } from "./fixtures";

const MATILDA = { ...FOX, isbn: "9780142410370", title: "Matilda" };
const owned = (metadata = FOX) => new Book({ ...metadata, shelf: Shelf.OWNED, acquisition: new Purchase() });
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const titles = (app: LibraryAppModel) => app.getState().view.owned.map((book) => book.title).sort();

/** One phone running the app: its store, the account model and the library model. */
async function phone(accounts: Accounts = new FakeAccounts(), backup: LibraryBackup = new FakeBackup()) {
  const store = new MemoryBookRepository();
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

  test("a forgotten password: email a code, then the code and a new password sign in", async () => {
    const accounts = new FakeAccounts();
    const { account } = await phone(accounts);
    account.showForm("forgot");
    account.setEmail("grace@example.com");
    await account.submit();
    expect(account.getState().form).toBe("reset");
    expect(account.submitLabel).toBe("Set new password");
    account.setCode("123456");
    account.setPassword("brand new pass");
    await account.submit();
    expect(account.getState().account?.id).toBe("user-1");
    expect(accounts.calls).toEqual(["sendResetCode grace@example.com", "resetPassword grace@example.com 123456 brand new pass"]);
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
    expect((await backup.pull("user-1")).map((version) => version.book.title)).toEqual(["Fantastic Mr. Fox"]);

    await phoneB.account.sync();
    await settle();
    expect(titles(phoneB.app)).toEqual(["Fantastic Mr. Fox"]);
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
    expect(await backup.pull("user-1")).toHaveLength(1);
  });

  test("with no Supabase settings the tab says so and the library works as before", async () => {
    const { account, app } = await phone(new UnconfiguredAccounts(), new UnconfiguredLibraryBackup());
    app.selectTab("account");
    expect(account.getState().configured).toBe(false);
    expect(app.hint).toBe("Accounts aren't set up in this copy of the app.");
    await signIn(account);
    expect(account.getState().notice?.text).toBe("Accounts aren't set up in this copy of the app.");
    expect(account.ownerId).toBe("local");
  });
});
