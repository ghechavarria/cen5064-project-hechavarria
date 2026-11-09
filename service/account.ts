/**
 * Service: the account use cases (core feature 4, ADR-012): sign up, sign in,
 * and sign out. Each one checks its input in the domain (Credentials) before
 * any network call, then goes through the Accounts port. AccountUseCases builds them all, plus sync.
 */
import { Credentials } from "../domain";
import { Account, Accounts, BookRepository, LibraryBackup, SyncStore } from "./ports";
import { SyncLibraryUseCase } from "./syncLibrary";

/** Base for the account use cases: holds the Accounts port. */
export abstract class AccountUseCase {
  constructor(protected readonly accounts: Accounts) {}
}

export class SignUpUseCase extends AccountUseCase {
  // Null when the account must first be confirmed from the email Supabase sends.
  execute(email: string, password: string): Promise<Account | null> {
    const credentials = Credentials.parse(email, password);
    return this.accounts.signUp(credentials.email, credentials.password);
  }
}

export class SignInUseCase extends AccountUseCase {
  execute(email: string, password: string): Promise<Account> {
    const credentials = Credentials.parse(email, password);
    return this.accounts.signIn(credentials.email, credentials.password);
  }
}

export class SignOutUseCase extends AccountUseCase {
  execute(): Promise<void> {
    return this.accounts.signOut();
  }
}

/** Every account use case and library sync, built once from their ports (like UseCases). */
export class AccountUseCases {
  readonly signUp: SignUpUseCase;
  readonly signIn: SignInUseCase;
  readonly signOut: SignOutUseCase;
  readonly sync: SyncLibraryUseCase;

  constructor(
    readonly accounts: Accounts,
    repository: BookRepository,
    store: SyncStore,
    backup: LibraryBackup,
  ) {
    this.signUp = new SignUpUseCase(accounts);
    this.signIn = new SignInUseCase(accounts);
    this.signOut = new SignOutUseCase(accounts);
    this.sync = new SyncLibraryUseCase(repository, store, backup);
  }
}
