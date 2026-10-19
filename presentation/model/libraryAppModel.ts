/**
 * Presentation model: LibraryAppModel — everything the screens know and do,
 * as one class (MVVM "view model"). It holds the screen state (tab, popup,
 * flash banner, busy flag, the current LibraryView) and the user flows
 * (scan with cover and binding choice, move, read/unread, cover photo, delete).
 * React components only render this state and call these methods; they hold
 * no logic of their own.
 *
 * It extends Observable (inheritance) and is composed with a
 * LibraryController (the bridge to the Service use cases).
 */
import { AcquisitionRecord, Book, BookFormat, Gift, Purchase, ReadingStatus, Shelf } from "../../domain";
import { DomainError } from "../../domain/exceptions";
import { BookSourceUnavailableError } from "../../service";
import { CatalogMode } from "./catalog";
import { CameraUnavailableError, CoverCamera } from "./coverCamera";
import { Labels } from "./labels";
import { LibraryController, LibraryView } from "./libraryController";
import { Observable } from "./observable";
import { ScanDraft } from "./scanDraft";

export type MenuTab = "tbr" | "owned" | "wanted" | "scan";
type Screen = "main" | "detail";
export type FlashTone = "info" | "danger";

/**
 * The popup currently open. Choice popups carry what to do next (onChoose /
 * onCancel), so the same "How did you get it?" and "Have you read it?" popups
 * serve both the scan flow and the Wanted → Owned flow.
 */
type Prompt =
  | { kind: "scanConfirm"; draft: ScanDraft }
  | { kind: "scanShelf"; draft: ScanDraft }
  | { kind: "format"; onChoose: (format: BookFormat) => void; onCancel: () => void }
  | AcquisitionPrompt
  | { kind: "giftName"; onChoose: (record: AcquisitionRecord) => void; onCancel: () => void }
  | { kind: "reading"; body: string; onChoose: (status: ReadingStatus) => void; onCancel: () => void }
  | { kind: "delete"; book: Book };

type AcquisitionPrompt = {
  kind: "acquire";
  body: string;
  onChoose: (record: AcquisitionRecord) => void;
  onCancel: () => void;
};

export type AppState = {
  ready: boolean;
  view: LibraryView;
  tab: MenuTab;
  screen: Screen;
  reading: ReadingStatus;
  catalogMode: CatalogMode;
  selectedIsbn: string | null;
  isbnDraft: string;
  giftName: string;
  flash: { text: string; tone: FlashTone } | null;
  busy: boolean;
  prompt: Prompt | null;
};

const TAB_HEADINGS: Record<MenuTab, string> = {
  tbr: "To be read",
  owned: "Owned",
  wanted: "Wanted",
  scan: "Add a book",
};

const FLASH_MS = 3000;

export class LibraryAppModel extends Observable<AppState> {
  private controller: LibraryController | null = null;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;

  // Both are injected: the app passes the real use cases and the device camera,
  // tests pass memory/fake Data and a fake camera.
  constructor(
    private readonly openController: () => Promise<LibraryController>,
    private readonly camera: CoverCamera,
  ) {
    super({
      ready: false,
      view: LibraryView.empty(),
      tab: "tbr",
      screen: "main",
      reading: ReadingStatus.UNREAD,
      catalogMode: "az",
      selectedIsbn: null,
      isbnDraft: "",
      giftName: "",
      flash: null,
      busy: false,
      prompt: null,
    });
  }

  // --- Derived values ---

  /** The book open on the detail screen, re-read from the latest view. */
  get selected(): Book | null {
    const { view, selectedIsbn } = this.getState();
    return view.find(selectedIsbn);
  }

  get heading(): string {
    const { screen, tab } = this.getState();
    return screen === "main" ? TAB_HEADINGS[tab] : this.selected?.title ?? "Book";
  }

  /** The line under the heading (counts, or the scan hint). */
  get hint(): string | null {
    const { screen, tab, view, reading } = this.getState();
    if (screen !== "main") {
      return null;
    }
    const hints: Record<MenuTab, string> = {
      tbr: reading === ReadingStatus.READ ? "Owned books you have finished." : "Owned books waiting to be read.",
      owned: `${Labels.count(view.owned.length, "title")} owned`,
      wanted: `${Labels.count(view.wanted.length, "title")} wanted`,
      scan: "Point the camera at the ISBN barcode, or type it below.",
    };
    return hints[tab];
  }

  /** The camera only reads barcodes when nothing else is going on. */
  get cameraListening(): boolean {
    const { busy, prompt } = this.getState();
    return !busy && prompt === null;
  }

  /** What fills the screen: one of the four tabs, or a book's detail. */
  get page(): MenuTab | "detail" {
    const { screen, tab } = this.getState();
    return screen === "detail" ? "detail" : tab;
  }

  /** TBR and Wanted are plain book lists: which books, and what to say when there are none. */
  get bookList(): { books: Book[]; empty: string } | null {
    const { view, reading } = this.getState();
    switch (this.page) {
      case "tbr":
        return { books: view.toBeRead(reading), empty: "Scan an ISBN onto Owned." };
      case "wanted":
        return { books: view.wanted, empty: "Scan an ISBN onto Wanted." };
      default:
        return null;
    }
  }

  /** TBR's Unread / Read switch, with a count on each side. */
  get readingSegments(): { key: ReadingStatus; label: string; read: boolean }[] {
    const { view } = this.getState();
    return Object.values(ReadingStatus).map((status) => ({
      key: status,
      label: `${Labels.readingTitle(status)} ${view.toBeRead(status).length}`,
      read: status === ReadingStatus.READ,
    }));
  }

  // --- Lifecycle ---

  /** Open the use cases, show the library, then backfill missing edition facts. */
  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;
    this.controller = await this.openController();
    this.setState({ ready: true, view: await this.controller.view(), busy: true });
    try {
      await this.controller.fillMissingFacts();
      this.setState({ view: await this.controller.view() });
    } catch {
      /* backfill is best effort */
    } finally {
      this.setState({ busy: false });
    }
  }

  dispose(): void {
    this.clearFlashTimer();
  }

  // --- Navigation and inputs ---

  selectTab(tab: MenuTab): void {
    this.setState({ tab, screen: "main" });
  }

  showReading(reading: ReadingStatus): void {
    this.setState({ reading });
  }

  setCatalogMode(catalogMode: CatalogMode): void {
    this.setState({ catalogMode });
  }

  setIsbnDraft(isbnDraft: string): void {
    this.setState({ isbnDraft });
  }

  setGiftName(giftName: string): void {
    this.setState({ giftName });
  }

  openBook(book: Book): void {
    this.setState({ selectedIsbn: book.isbn, screen: "detail" });
  }

  back(): void {
    this.setState({ screen: "main" });
  }

  dismissFlash(): void {
    this.clearFlashTimer();
    this.setState({ flash: null });
  }

  // --- Scan flow ---
  // lookup → confirm (pick the matching cover) → (binding unknown: hardcover/paperback)
  // → shelf → (Owned: purchased/gifted) → read/unread → save

  scan(code: string = this.getState().isbnDraft): Promise<void> {
    return this.run(async (library) => {
      this.setState({ prompt: { kind: "scanConfirm", draft: ScanDraft.from(await library.lookup(code)) } });
    });
  }

  /** Tap a cover in the confirm popup: the one that matches the owner's copy. */
  selectCover(url: string): void {
    const prompt = this.getState().prompt;
    if (prompt?.kind === "scanConfirm") {
      this.setState({ prompt: { kind: "scanConfirm", draft: prompt.draft.withCover(url) } });
    }
  }

  /** None of the sources' covers match: photograph the owner's own copy instead. */
  async photographScanCover(): Promise<void> {
    const photo = await this.takeCoverPhoto();
    const prompt = this.getState().prompt;
    if (photo && prompt?.kind === "scanConfirm") {
      this.setState({ prompt: { kind: "scanConfirm", draft: prompt.draft.withCover(photo) } });
    }
  }

  confirmScan(): void {
    const prompt = this.getState().prompt;
    if (prompt?.kind !== "scanConfirm") {
      return;
    }
    const { draft } = prompt;
    // A book already cataloged just gains a copy: no more questions.
    if (draft.alreadyInLibrary) {
      void this.finishScan(draft, Shelf.OWNED, ReadingStatus.UNREAD);
      return;
    }
    const askShelf = (ready: ScanDraft) => this.setState({ prompt: { kind: "scanShelf", draft: ready } });
    if (draft.needsFormat) {
      this.setState({
        prompt: {
          kind: "format",
          onChoose: (format) => askShelf(draft.withFormat(format)),
          onCancel: () => this.rejectScan(),
        },
      });
    } else {
      askShelf(draft);
    }
  }

  chooseFormat(format: BookFormat): void {
    const prompt = this.getState().prompt;
    if (prompt?.kind === "format") {
      prompt.onChoose(format);
    }
  }

  chooseScanShelf(shelf: Shelf): void {
    const prompt = this.getState().prompt;
    if (prompt?.kind !== "scanShelf") {
      return;
    }
    const { draft } = prompt;
    const askReading = (acquisition?: AcquisitionRecord) =>
      this.askReading(
        `This copy will land on ${Labels.shelf(shelf)}.`,
        (status) => void this.finishScan(draft, shelf, status, acquisition),
        () => this.rejectScan(),
      );
    if (shelf === Shelf.OWNED) {
      this.askAcquisition(
        "Owned books are recorded as a purchase or a gift.",
        askReading,
        () => this.rejectScan(),
      );
    } else {
      askReading();
    }
  }

  rejectScan(): void {
    this.setState({ prompt: null, isbnDraft: "", giftName: "" });
    this.flash("Nothing added.");
  }

  // --- Detail actions ---

  /** Wanted → Owned asks purchased/gifted first; either direction asks read/unread. */
  moveSelected(target: Shelf): void {
    const book = this.selected;
    if (!book) {
      return;
    }
    const askReading = (acquisition?: AcquisitionRecord) =>
      this.askReading(
        `Then this title moves to ${Labels.shelf(target)}.`,
        (status) => void this.finishMove(book.isbn, target, status, acquisition),
      );
    if (target === Shelf.OWNED) {
      this.askAcquisition("Wanted books can only move to Owned as a purchase or a gift.", askReading);
    } else {
      askReading();
    }
  }

  toggleReading(): Promise<void> {
    const book = this.selected;
    if (!book) {
      return Promise.resolve();
    }
    const status =
      book.readingStatus === ReadingStatus.READ ? ReadingStatus.UNREAD : ReadingStatus.READ;
    return this.run(async (library) => {
      await library.setReading(book.isbn, status);
      this.flash(`Marked ${Labels.reading(status)}.`);
      this.setState({ reading: status });
    });
  }

  /** Replace the open book's cover with a photo of the owner's copy. */
  async changeCover(): Promise<void> {
    const book = this.selected;
    const photo = book ? await this.takeCoverPhoto() : null;
    if (!book || !photo) {
      return;
    }
    await this.run(async (library) => {
      await library.changeCover(book.isbn, photo);
      this.flash("Cover updated.");
    });
  }

  askDelete(): void {
    const book = this.selected;
    if (book) {
      this.setState({ prompt: { kind: "delete", book } });
    }
  }

  confirmDelete(): Promise<void> {
    const prompt = this.getState().prompt;
    if (prompt?.kind !== "delete") {
      return Promise.resolve();
    }
    return this.run(async (library) => {
      await library.remove(prompt.book.isbn);
      this.flash(`Removed ${prompt.book.title}.`);
      this.setState({ selectedIsbn: null, screen: "main" });
    });
  }

  // --- Popup answers ---

  choosePurchased(): void {
    this.acquirePrompt()?.onChoose(new Purchase());
  }

  // Gifted needs a name, so it opens the name popup with the same continuation.
  chooseGifted(): void {
    const prompt = this.acquirePrompt();
    if (prompt) {
      this.setState({
        prompt: { kind: "giftName", onChoose: prompt.onChoose, onCancel: prompt.onCancel },
      });
    }
  }

  // A Gift with no giver is incomplete (polymorphic isComplete), so the popup stays open.
  continueGift(): void {
    const { prompt, giftName } = this.getState();
    const gift = new Gift(giftName);
    if (prompt?.kind === "giftName" && gift.isComplete()) {
      prompt.onChoose(gift);
    }
  }

  chooseReading(status: ReadingStatus): void {
    const prompt = this.getState().prompt;
    if (prompt?.kind === "reading") {
      prompt.onChoose(status);
    }
  }

  /** Close the open popup; scan popups treat that as "Nothing added." */
  cancelPrompt(): void {
    const prompt = this.getState().prompt;
    if (prompt && "onCancel" in prompt) {
      prompt.onCancel();
    } else if (prompt?.kind === "scanConfirm" || prompt?.kind === "scanShelf") {
      this.rejectScan();
    } else {
      this.setState({ prompt: null });
    }
  }

  // --- Private helpers ---

  private finishScan(
    draft: ScanDraft,
    shelf: Shelf,
    status: ReadingStatus,
    acquisition?: AcquisitionRecord,
  ): Promise<void> {
    return this.run(async (library) => {
      const book = await library.scan(draft.metadata, shelf, status, acquisition, draft.choices);
      this.flash(
        book.copyCount > 1
          ? `${book.title} is already in your library. Copies: ${book.copyCount}.`
          : `Added ${book.title} to ${Labels.shelf(book.shelf)} (${Labels.reading(book.readingStatus)}).`,
      );
      this.setState({
        isbnDraft: "",
        giftName: "",
        tab: book.shelf === Shelf.OWNED ? "tbr" : "wanted",
        reading: book.readingStatus,
        screen: "main",
      });
    });
  }

  private finishMove(
    isbn: string,
    target: Shelf,
    status: ReadingStatus,
    acquisition?: AcquisitionRecord,
  ): Promise<void> {
    return this.run(async (library) => {
      await library.move(isbn, target, status, acquisition);
      this.flash(`Moved to ${Labels.shelf(target)} (${Labels.reading(status)}).`);
      this.setState({
        giftName: "",
        tab: target === Shelf.OWNED ? "owned" : "wanted",
        screen: "main",
      });
    });
  }

  /**
   * The one wrapper every action goes through: set busy, close the popup,
   * do the work, reload the view, and turn errors into a flash banner
   * (domain rule messages as a normal notice; an unreachable book source or
   * anything unexpected in red).
   */
  private async run(work: (library: LibraryController) => Promise<void>): Promise<void> {
    const library = this.controller;
    if (!library) {
      return;
    }
    this.setState({ busy: true, prompt: null });
    try {
      await work(library);
      this.setState({ view: await library.view() });
    } catch (error) {
      if (error instanceof DomainError) {
        this.flash(error.message);
      } else {
        this.flash(
          error instanceof BookSourceUnavailableError ? error.message : "Could not update the library.",
          "danger",
        );
      }
    } finally {
      this.setState({ busy: false });
    }
  }

  // The camera reports refusal as an error; show it, and treat it like backing out.
  private async takeCoverPhoto(): Promise<string | null> {
    try {
      return await this.camera.takePhoto();
    } catch (error) {
      this.flash(
        error instanceof CameraUnavailableError ? error.message : "Could not take a photo.",
        "danger",
      );
      return null;
    }
  }

  private askReading(
    body: string,
    onChoose: (status: ReadingStatus) => void,
    onCancel: () => void = () => this.setState({ prompt: null }),
  ): void {
    this.setState({ prompt: { kind: "reading", body, onChoose, onCancel } });
  }

  private askAcquisition(
    body: string,
    onChoose: (record: AcquisitionRecord) => void,
    onCancel: () => void = () => this.setState({ prompt: null }),
  ): void {
    this.setState({ prompt: { kind: "acquire", body, onChoose, onCancel } });
  }

  private acquirePrompt(): AcquisitionPrompt | null {
    const prompt = this.getState().prompt;
    return prompt?.kind === "acquire" ? prompt : null;
  }

  // Banner that hides itself after FLASH_MS; a new message restarts the timer.
  private flash(text: string, tone: FlashTone = "info"): void {
    this.clearFlashTimer();
    this.setState({ flash: { text, tone } });
    this.flashTimer = setTimeout(() => this.setState({ flash: null }), FLASH_MS);
  }

  private clearFlashTimer(): void {
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
    }
  }
}
