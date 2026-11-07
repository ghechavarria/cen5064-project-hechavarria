/**
 * Tests: core feature 4, account sign-in and library sync (ADR-012). Credentials
 * are checked in the domain; the use cases and sync run against fakes, so no
 * network or Supabase project is needed.
 */
import { MemoryBookRepository } from "../data/bookRepository";
import { Credentials } from "../domain";
import { InvalidCredentialsError } from "../domain/exceptions";
import { AccountUseCases } from "../service";
import { FakeAccounts, FakeBackup } from "./fixtures";

function accountUseCases() {
  const accounts = new FakeAccounts();
  const store = new MemoryBookRepository();
  return { accounts, useCases: new AccountUseCases(accounts, store, store, new FakeBackup()) };
}

describe("Account use cases", () => {
  test("sign up, sign in and sign out pass the cleaned-up email to the account service", async () => {
    const { accounts, useCases } = accountUseCases();
    expect(await useCases.signUp.execute(" Grace@Example.com ", "correct horse")).toEqual({ id: "user-1", email: "grace@example.com" });
    await useCases.signOut.execute();
    await useCases.signIn.execute("GRACE@example.com", "correct horse");
    expect(accounts.calls).toEqual(["signUp grace@example.com correct horse", "signOut", "signIn grace@example.com correct horse"]);
  });

  test("a bad email, short password or malformed code never reaches the account service", async () => {
    const { accounts, useCases } = accountUseCases();
    expect(() => useCases.signIn.execute("grace", "correct horse")).toThrow(InvalidCredentialsError);
    expect(() => useCases.signUp.execute("grace@example.com", "short")).toThrow(InvalidCredentialsError);
    expect(() => useCases.resetPassword.sendCode("not an email")).toThrow(InvalidCredentialsError);
    expect(() => useCases.resetPassword.execute("grace@example.com", "12ab", "correct horse")).toThrow(
      new InvalidCredentialsError("Enter the code from the email."),
    );
    expect(accounts.calls).toEqual([]);
  });

  test("a forgotten password: a code is emailed, then the code and a new password sign in", async () => {
    const { accounts, useCases } = accountUseCases();
    await useCases.resetPassword.sendCode("grace@example.com");
    expect(await useCases.resetPassword.execute("grace@example.com", " 123 456 ", "brand new pass")).toEqual({
      id: "user-1",
      email: "grace@example.com",
    });
    expect(accounts.calls).toEqual(["sendResetCode grace@example.com", "resetPassword grace@example.com 123456 brand new pass"]);
  });
});

describe("Credentials", () => {
  test("a valid email is trimmed and lower-cased; the password is kept as typed", () => {
    const credentials = Credentials.parse("  Grace@Example.COM ", "Secret pass1 ");
    expect(credentials.email).toBe("grace@example.com");
    expect(credentials.password).toBe("Secret pass1 ");
  });

  test("a malformed email or a short password is refused with a message to show", () => {
    for (const email of ["", "grace", "grace@", "grace@example", "gr ace@example.com"]) {
      expect(() => Credentials.parse(email, "long enough")).toThrow(new InvalidCredentialsError("Enter a valid email address."));
    }
    expect(() => Credentials.parse("grace@example.com", "short")).toThrow(
      new InvalidCredentialsError("Use a password of at least 8 characters."),
    );
  });
});
