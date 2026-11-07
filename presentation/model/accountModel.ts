/**
 * Presentation model: AccountModel — the Account screen's state and actions
 * (core feature 4, ADR-012), and the bridge to the account use cases. It holds
 * the form being filled in, the signed-in account, and how the last sync went.
 *
 * LibraryAppModel watches it: when the account changes, the library switches
 * to that account's books; when a sync brings books in, the shelves reload; and
 * after every change to the library it asks for a sync. While someone is signed
 * in, a change made on another phone starts a sync here too (auto sync).
 */
import { DomainError } from "../../domain/exceptions";
import { Account, AccountError, AccountUseCases, SyncUnavailableError } from "../../service";
import { Observable } from "./observable";

/** Which form the screen shows when nobody is signed in. */
export type AccountForm = "signIn" | "signUp";

/** off: not signed in; syncing; synced; waiting: offline, the phone's copy syncs later. */
type SyncStatus = "off" | "syncing" | "synced" | "waiting";

export type AccountState = {
  ready: boolean;
  configured: boolean;
  account: Account | null;
  form: AccountForm;
  email: string;
  password: string;
  busy: boolean;
  notice: { text: string; tone: "info" | "danger" } | null;
  sync: SyncStatus;
};

type Listener<T> = (value: T) => void;

export class AccountModel extends Observable<AccountState> {
  private useCases: AccountUseCases | null = null;
  private readonly ownerListeners = new Set<Listener<string>>();
  private readonly libraryListeners = new Set<Listener<void>>();
  private syncing: Promise<void> | null = null;
  private syncAgain = false;
  private started = false;
  private stopWatching: (() => void) | null = null;

  // The use cases come from bootstrap, which opens them asynchronously.
  // `deviceOwnerId` owns the books kept while nobody is signed in.
  constructor(
    private readonly openUseCases: () => Promise<AccountUseCases>,
    private readonly deviceOwnerId = "local",
  ) {
    super({
      ready: false,
      configured: false,
      account: null,
      form: "signIn",
      email: "",
      password: "",
      busy: false,
      notice: null,
      sync: "off",
    });
  }

  // --- Derived values ---

  /** Whose library the app shows: the signed-in account's, or this device's own. */
  get ownerId(): string {
    return this.getState().account?.id ?? this.deviceOwnerId;
  }

  /** The line under the Account heading. */
  get hint(): string {
    const { configured, account, sync } = this.getState();
    if (!configured) {
      return "Accounts aren't set up in this copy of the app.";
    }
    if (!account) {
      return "Sign in to keep your library on all your phones.";
    }
    const status: Record<SyncStatus, string> = {
      off: "",
      syncing: "Syncing your library…",
      synced: "Your library is up to date.",
      waiting: "Saved on this phone. It will sync when you're back online.",
    };
    return status[sync];
  }

  /** The main button's label for the form on screen. */
  get submitLabel(): string {
    const labels: Record<AccountForm, string> = {
      signIn: "Sign in",
      signUp: "Create account",
    };
    return labels[this.getState().form];
  }

  // --- Lifecycle ---

  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;
    const useCases = await this.openUseCases();
    this.useCases = useCases;
    const account = await useCases.accounts.current();
    this.setState({ ready: true, configured: useCases.accounts.configured, account, sync: account ? "synced" : "off" });
    this.watchBackup();
    // A session can also end outside the app's buttons (expired, revoked).
    useCases.accounts.onChange((changed) => {
      if (!changed && this.getState().account && !this.getState().busy) {
        this.become(null);
      }
    });
  }

  dispose(): void {
    this.stopWatching?.();
    this.stopWatching = null;
  }

  /** Called with the new owner id whenever someone signs in or out. */
  watchOwner(listener: Listener<string>): () => void {
    this.ownerListeners.add(listener);
    return () => this.ownerListeners.delete(listener);
  }

  /** Called when a sync brings books from another phone, so the shelves reload. */
  watchLibrary(listener: Listener<void>): () => void {
    this.libraryListeners.add(listener);
    return () => this.libraryListeners.delete(listener);
  }

  // --- Form inputs ---

  showForm(form: AccountForm): void {
    this.setState({ form, notice: null, password: "" });
  }

  setEmail(email: string): void {
    this.setState({ email });
  }

  setPassword(password: string): void {
    this.setState({ password });
  }

  dismissNotice(): void {
    this.setState({ notice: null });
  }

  // --- Actions ---

  /** The main button: does what the form on screen is for. */
  submit(): Promise<void> {
    const { form, email, password } = this.getState();
    return this.act(async (useCases) => {
      switch (form) {
        case "signIn":
          return this.signedIn(useCases, await useCases.signIn.execute(email, password));
        case "signUp": {
          const account = await useCases.signUp.execute(email, password);
          if (account) {
            return this.signedIn(useCases, account);
          }
          this.setState({ form: "signIn", password: "" });
          return this.notify("Check your email and confirm your account, then sign in here.");
        }
      }
    });
  }

  signOut(): Promise<void> {
    return this.act(async (useCases) => {
      await useCases.signOut.execute();
      this.become(null);
      this.setState({ form: "signIn", password: "" });
      this.notify("Signed out. Your books are kept in your account.");
    });
  }

  /** Sync now; if a sync is already running, one more follows it so no change is missed. */
  sync(): Promise<void> {
    const useCases = this.useCases;
    if (!this.getState().account || !useCases) {
      return Promise.resolve();
    }
    if (this.syncing) {
      this.syncAgain = true;
      return this.syncing;
    }
    this.syncing = this.syncUntilCaughtUp(useCases).finally(() => (this.syncing = null));
    return this.syncing;
  }

  // --- Private helpers ---

  // Sign-in and sign-up both end here: move this phone's books into the
  // account and sync, then show that account's library.
  private async signedIn(useCases: AccountUseCases, account: Account): Promise<void> {
    this.setState({ sync: "syncing", password: "" });
    try {
      await useCases.sync.signedIn(account.id, this.deviceOwnerId);
      this.setState({ sync: "synced" });
    } catch (error) {
      this.setState({ sync: "waiting" });
      if (!(error instanceof SyncUnavailableError)) {
        throw error;
      }
    }
    this.become(account);
    this.notify(`Signed in as ${account.email}.`);
  }

  private async syncUntilCaughtUp(useCases: AccountUseCases): Promise<void> {
    do {
      this.syncAgain = false;
      const account = this.getState().account;
      if (!account) {
        return;
      }
      this.setState({ sync: "syncing" });
      try {
        const report = await useCases.sync.execute(account.id);
        this.setState({ sync: "synced" });
        if (report.downloaded > 0) {
          this.libraryListeners.forEach((listener) => listener());
        }
      } catch {
        this.setState({ sync: "waiting" }); // offline or refused: the phone keeps its copy
        return;
      }
    } while (this.syncAgain);
  }

  private become(account: Account | null): void {
    this.setState({ account, sync: account ? this.getState().sync : "off" });
    this.watchBackup();
    this.ownerListeners.forEach((listener) => listener(this.ownerId));
  }

  // Auto sync: listen to the signed-in account's backup (only one at a time),
  // and sync whenever another phone changes it.
  private watchBackup(): void {
    this.dispose();
    const account = this.getState().account;
    if (account && this.useCases) {
      this.stopWatching = this.useCases.sync.watch(account.id, () => void this.sync());
    }
  }

  /**
   * The wrapper every account action goes through: busy while it runs, and
   * every failure becomes a notice (a rule the input broke or an account
   * message as a normal notice; anything unexpected in red).
   */
  private async act(work: (useCases: AccountUseCases) => Promise<void>): Promise<void> {
    if (!this.useCases || this.getState().busy) {
      return;
    }
    this.setState({ busy: true, notice: null });
    try {
      await work(this.useCases);
    } catch (error) {
      if (error instanceof DomainError || error instanceof AccountError) {
        this.notify(error.message);
      } else {
        this.notify("Something went wrong. Try again.", "danger");
      }
    } finally {
      this.setState({ busy: false });
    }
  }

  private notify(text: string, tone: "info" | "danger" = "info"): void {
    this.setState({ notice: { text, tone } });
  }
}
