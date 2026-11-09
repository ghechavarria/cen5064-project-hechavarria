/**
 * Data: the Accounts port (ADR-012). SupabaseAccounts signs in with an email and
 * password through Supabase Auth; UnconfiguredAccounts is the Null Object used
 * when the app has no Supabase settings, so the rest of the app runs unchanged.
 * Supabase errors become AccountError with a sentence the account screen can show.
 */
import { Account, AccountError, Accounts } from "../service/ports";
import type { SupabaseAuth, SupabaseError, SupabaseUser } from "./supabase";

// Supabase Auth error codes → what the person should do next.
const MESSAGES: Record<string, string> = {
  invalid_credentials: "That email and password don't match an account.",
  email_not_confirmed: "Confirm your email first: open the message we sent you, then sign in.",
  user_already_exists: "An account with that email already exists. Sign in instead.",
  email_exists: "An account with that email already exists. Sign in instead.",
  email_address_invalid: "Enter a valid email address.",
  weak_password: "Choose a stronger password: at least 8 characters and not a common one.",
  over_email_send_rate_limit: "Too many emails were sent. Wait a few minutes and try again.",
  over_request_rate_limit: "Too many tries. Wait a minute and try again.",
  signup_disabled: "New accounts are turned off for this app.",
};
const OFFLINE = "Couldn't reach the account service. Check your connection and try again.";
const UNKNOWN = "Something went wrong with your account. Try again.";

export class SupabaseAccounts implements Accounts {
  readonly configured = true;

  constructor(private readonly auth: SupabaseAuth) {}

  async current(): Promise<Account | null> {
    const { data, error } = await this.call(() => this.auth.getSession());
    return error || !data.session ? null : SupabaseAccounts.account(data.session.user);
  }

  // With email confirmation on, Supabase answers with no session: the person
  // confirms by email and then signs in, so there is no account to return yet.
  async signUp(email: string, password: string): Promise<Account | null> {
    const { data } = SupabaseAccounts.check(await this.call(() => this.auth.signUp({ email, password })));
    return data.session ? SupabaseAccounts.account(data.session.user) : null;
  }

  async signIn(email: string, password: string): Promise<Account> {
    const { data } = SupabaseAccounts.check(await this.call(() => this.auth.signInWithPassword({ email, password })));
    return SupabaseAccounts.signedIn(data.user);
  }

  async signOut(): Promise<void> {
    SupabaseAccounts.check(await this.call(() => this.auth.signOut()));
  }

  onChange(listener: (account: Account | null) => void): () => void {
    const { data } = this.auth.onAuthStateChange((_event, session) =>
      listener(session ? SupabaseAccounts.account(session.user) : null),
    );
    return () => data.subscription.unsubscribe();
  }

  // A thrown network failure is reported like any other Supabase error.
  private async call<T extends { error: SupabaseError | null }>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (thrown) {
      return { error: { message: String(thrown), status: 0 } } as T;
    }
  }

  private static check<T extends { error: SupabaseError | null }>(answer: T): T {
    if (answer.error) {
      throw new AccountError(SupabaseAccounts.explain(answer.error));
    }
    return answer;
  }

  private static explain(error: SupabaseError): string {
    if (error.code && MESSAGES[error.code]) {
      return MESSAGES[error.code];
    }
    return error.status === 0 || /fetch|network/i.test(error.message) ? OFFLINE : UNKNOWN;
  }

  private static signedIn(user: SupabaseUser | null): Account {
    if (!user) {
      throw new AccountError(UNKNOWN);
    }
    return SupabaseAccounts.account(user);
  }

  private static account(user: SupabaseUser): Account {
    return { id: user.id, email: user.email ?? "" };
  }
}

/** Null Object: no Supabase settings in this copy of the app. Nobody is signed in, and nothing syncs. */
export class UnconfiguredAccounts implements Accounts {
  readonly configured = false;

  async current(): Promise<Account | null> {
    return null;
  }

  async signUp(): Promise<Account | null> {
    throw UnconfiguredAccounts.notSetUp();
  }

  async signIn(): Promise<Account> {
    throw UnconfiguredAccounts.notSetUp();
  }

  async signOut(): Promise<void> {}

  onChange(): () => void {
    return () => undefined;
  }

  private static notSetUp(): AccountError {
    return new AccountError("Accounts aren't set up in this copy of the app.");
  }
}
