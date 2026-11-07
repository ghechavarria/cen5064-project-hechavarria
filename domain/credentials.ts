/**
 * Domain: Credentials — an email and password that are good enough to send to
 * the account service. Checked before any network call, like Isbn.parse.
 */
import { InvalidCredentialsError } from "./exceptions";

export class Credentials {
  static readonly MIN_PASSWORD = 8;

  private constructor(
    readonly email: string,
    readonly password: string,
  ) {}

  // Email trimmed and lower-cased (one account per address); the password is kept as typed.
  static parse(email: string, password: string): Credentials {
    return new Credentials(Credentials.email(email), Credentials.password(password));
  }

  static email(raw: string): string {
    const email = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new InvalidCredentialsError("Enter a valid email address.");
    }
    return email;
  }

  // The password-reset code from the email: digits only (6 by default in Supabase).
  static resetCode(raw: string): string {
    const code = raw.replace(/\s/g, "");
    if (!/^\d{6,10}$/.test(code)) {
      throw new InvalidCredentialsError("Enter the code from the email.");
    }
    return code;
  }

  static password(raw: string): string {
    if (raw.length < Credentials.MIN_PASSWORD) {
      throw new InvalidCredentialsError(`Use a password of at least ${Credentials.MIN_PASSWORD} characters.`);
    }
    return raw;
  }
}
