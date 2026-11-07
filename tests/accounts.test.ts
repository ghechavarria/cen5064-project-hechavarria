/**
 * Tests: core feature 4, account sign-in and library sync (ADR-012). Credentials
 * are checked in the domain; the use cases and sync run against fakes, so no
 * network or Supabase project is needed.
 */
import { Credentials } from "../domain";
import { InvalidCredentialsError } from "../domain/exceptions";

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
