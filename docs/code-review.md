# MyHomeLib — study guide (1,000-foot view)

Scan a book's ISBN, get the **exact edition** (publisher, binding, cover) from Open Library and Google Books, and file it as **Owned** or **Wanted**. TBR is your Owned books split into unread and read. The rules live in the domain: a duplicate ISBN adds a copy; every Owned book must be Purchased or Gifted; a gift needs the giver's name. You sign in with an email and password, and your library syncs to every phone signed in to the same account (core feature 4, through Supabase).

Decisions and their reasons: [`docs/adr/`](adr/). Full C4/UML set: [`README.md`](../README.md). The Software Design Document (all diagrams, requirements traceability, sprints, and verification with screenshots): [`docs/design/DesignDocument_Hechavarria.pdf`](design/DesignDocument_Hechavarria.pdf); its diagram sources are in `docs/design/diagrams/`.

---

## 1. The big picture: tiers, folders, and who may call whom

```mermaid
flowchart TB
    user(["You"])
    subgraph P["presentation/  (Presentation tier)"]
        comp["components/ + App.tsx<br/>draw only"]
        model["model/<br/>LibraryAppModel (view model) · LibraryController · AccountModel<br/>ScanDraft · PromptActions · Catalog · AlphabetRail · Labels"]
        device["device/<br/>PhoneDevices, BrowserDevices"]
        styles["styles/<br/>one stylesheet per component + theme"]
    end
    subgraph S["service/  (Service tier)"]
        uc["Use cases: Scan · Lookup · Move · SetReading · ChangeCover · Delete · FillMissingFacts<br/>SignUp · SignIn · SignOut · SyncLibrary"]
        ports["ports.ts — interfaces<br/>BookRepository · IsbnCache · IsbnLookup<br/>SyncStore · LibraryBackup · Accounts"]
    end
    subgraph D["domain/  (Domain tier)"]
        rules["Book · PersonalLibrary · Purchase / Gift · Isbn · Credentials · enums · errors"]
    end
    subgraph DA["data/  (Data tier)"]
        repo["SqliteBookRepository (phone) · JsonBookRepository (web)<br/>BookRowMapper"]
        src["OpenLibraryIsbnLookup · GoogleBooksIsbnLookup<br/>MergedIsbnLookup · CachingIsbnLookup · Http"]
        acct["SupabaseAccounts · SupabaseLibraryBackup<br/>SupabaseConnection"]
    end
    root["bootstrap.ts — CompositionRoot<br/>picks the concrete classes"]
    ol[("Open Library")]
    gb[("Google Books")]
    sb[("Supabase")]

    user --> comp
    comp --> model
    comp -. imports .-> styles
    model --> uc
    model --> device
    uc --> rules
    uc --> ports
    repo -. implements .-> ports
    src -. implements .-> ports
    src --> ol
    src --> gb
    acct -. implements .-> ports
    acct --> sb
    root -. wires .-> acct
    root -. wires .-> repo
    root -. wires .-> src
    root -. hands use cases to .-> model
```

**The one rule:** arrows only point down. Service never imports Data; it only knows the *interfaces* in `ports.ts`, and Data implements them (dependency inversion). Domain imports nothing. The UI never touches a repository or `fetch`. `tests/architecture.test.ts` **fails the build** if any of that is broken, or if a component writes its own styles.

---

## 2. What calls what, in plain words

**The one-sentence version:** the screen asks the view model, the view model asks the controller, the controller asks one use case, and the use case asks the domain (the rules) and the repository (the storage). The answer flows back up, and the screen redraws.

**Who does what (an analogy):**

| Part | Plain-English job | Like… |
|---|---|---|
| Components (`presentation/components/`) | Draw the screen and pass on your taps. Never decide anything. | The front desk |
| `LibraryAppModel` | The screen's brain: remembers which tab and popup are open, which question comes next, and the message to show. | The desk manager |
| `LibraryController` | Turns "the user wants X" into a call to the right use case. | The messenger |
| Use cases (`service/`) | One job each ("scan a book", "move a book"): load the library, change it, save it. | A clerk with one task |
| Domain (`Book`, `PersonalLibrary`, `Purchase` / `Gift`) | The rules: a duplicate is a copy; Owned needs a purchase or a gift; a gift needs a name. | The rulebook |
| Ports (`service/ports.ts`) | The shapes the use cases expect to plug into ("something that can save books", "something that can look up an ISBN"). | Wall sockets |
| Repositories (`data/`) | Save and load books: SQLite on a phone, browser storage on the web. | The filing cabinet |
| Book sources (`data/`) | Look up an ISBN on Open Library and Google Books. | The reference librarians |
| `AccountModel` + account use cases | Sign you in or out, and keep the shelves in step with your account. | The membership desk |
| Supabase adapters (`data/`) | Talk to Supabase: check your password, and read and write your account's copy of the library. | The off-site archive |
| `CompositionRoot` (`bootstrap.ts`) | At start-up, plugs the real cabinet and librarians into the sockets. | The electrician |

**When the app opens:**
1. `index.ts` registers `App.tsx` with Expo.
2. `App.tsx` creates `LibraryAppModel`, handing it a recipe for its controller, and calls `model.start()`.
3. `start()` runs the recipe: `CompositionRoot.open()` opens the database, sets up the book sources (Google only if there's a key), connects to Supabase (the project in `.env`, or the shared one built into the app), and builds the `UseCases` and the `AccountUseCases`. The library ones go into a new `LibraryController`; the account ones into `AccountModel`.
4. `AccountModel` asks who is signed in. Signed in: the library shows that account's books. Nobody signed in: the shelves stay empty and Scan is off until you sign in on the Account tab.
5. `start()` then calls `controller.view()` → `LoadLibraryUseCase` → `repository.loadLibrary()`. The shelves land in the model's state, and the screen draws them.
6. Last, it quietly fills in any missing edition facts (`FillMissingFactsUseCase`), redraws, and syncs with your account.

**When you tap anything (every action follows this path):**
1. The component calls a method on the model, e.g. `moveSelected(OWNED)`.
2. If the model needs an answer from you first, it opens a popup and waits ("How did you get it?").
3. The model calls the controller, which calls one use case.
4. The use case loads the library, calls a domain method (the rules are checked there), and saves.
5. The model reloads the shelves into its state. Because it is an `Observable`, every change notifies React (through `useObservable`), and the screen redraws.
6. If you are signed in, the change is synced to your account, and your other phones pick it up.

**When something goes wrong:** the domain throws a named error (for example `NotAcquiredError`). Every library action goes through the model's `run()`, which catches the error in one place and shows it in the message banner (a broken rule as a normal notice, anything unexpected in red); nothing is saved.

**What never happens:** a screen never talks to the database or the internet, a use case never imports SQLite or `fetch`, and the domain never imports anything. `tests/architecture.test.ts` fails if anyone tries.

---

## 3. Where code lives, and why there

| Folder | Holds | Why it lives here |
|---|---|---|
| `domain/` | `Book`, `PersonalLibrary`, `AcquisitionRecord` → `Purchase` / `Gift`, `Isbn`, `Credentials`, enums, typed errors | **The rules.** Nothing external is imported, so nothing can bypass them, and they're tested in isolation. |
| `service/` | One class per use case. Base classes `LibraryUseCase` → `LibraryLookupUseCase`, and `AccountUseCase` for sign-up / in / out. `SyncLibraryUseCase` merges the phone's copy with the account's. `UseCases` and `AccountUseCases` build them all. `ports.ts` holds the interfaces. | **Orchestration:** load → apply domain methods → save. It depends on interfaces, so storage and sources can change freely. |
| `data/` | Repositories (SQLite, JSON, Memory, which also serve sync), `BookRowMapper`, book sources (Open Library, Google), decorators (`Merged`, `Caching`), `Http`, and the Supabase adapters (`SupabaseConnection`, `SupabaseAccounts`, `SupabaseLibraryBackup`, plus the `Unconfigured…` Null Objects) | **The outside world.** The only place SQL, HTTP and Supabase exist. |
| `bootstrap.ts` | `CompositionRoot` | **The only place concrete classes are named:** SQLite vs JSON, Google only if a key exists, which Supabase project (or the Null Objects). |
| `supabase/migrations/` | The SQL for the `library_books` table, its row level security rules, and Realtime | **Run once in the Supabase dashboard**; the app never creates tables. |
| `presentation/model/` | `LibraryAppModel` (all screen state and flows), `AccountModel` (the Account tab, and whose library is shown), `LibraryController`, `LibraryView`, `ScanDraft`, `CoverCamera`, `Feedback` and `DeviceFamily` (the device interfaces), `PromptActions`, `Catalog`, `AlphabetRail`, `Labels`, plus the `useObservable` and `useReducedMotion` hooks | **Screen logic as plain classes.** No React, so every flow is unit-tested. |
| `presentation/device/` | `PhoneDevices` (`ExpoCoverCamera`, `HapticFeedback`), `BrowserDevices` (a camera that says to use the phone, silent feedback) | **Device families (Abstract Factory):** `App.tsx` picks one, so the camera and the feedback always belong to the same platform. The model only sees the interfaces. |
| `presentation/components/` + `App.tsx` | Views: `LibraryPrompts`, `CoverPicker`, `BookDetail`, `OwnedCatalog`, `LetterRail`, `ScreenHeader` (logo or round Back, title, hint, fading rule), `MenuBar` (sliding pill, Scan as the mint primary action), `Logo` (mark + wordmark, in the header and on the loading screen), `TextField` (the one text input, with a focus ring), `CoverBackdrop` (a cover's blurred halo: behind the detail cover, each series fan, and the scan popup's cover picker), `BookCover` (art + spine + shadow), … images through `Art` (expo-image: cached on the device, fading in), all built on `Tappable` (the one pressable: Android ripple, iOS spring press-in); list cards enter through `Reveal` (fade-and-rise stagger that stands still under the phone's Reduce Motion, via the `useReducedMotion` hook) | **Drawing only:** read state, call model methods. |
| `presentation/styles/` | `<name>.styles.ts` per component, plus `theme.ts` (the design tokens: colors, spacing, radii, type scale, icon sizes, the shared card, panel and cover surfaces, and the forest's top/bottom fades), `fonts.ts` (the bundled Outfit family in four weights, loaded once in `App.tsx`; `theme.text` gives each role its weight: display, title, ui, strong, body) and `feedback.styles.ts` (the shared motion values: press spring, ripple, entrance timing) | **Stylesheets are imports**, and every value comes from a token, so one change restyles the whole app. |
| `tests/` | One test file per tier, plus `architecture.test.ts` and `fixtures.ts` | They prove the rules and enforce the layout. |

---

## 4. Front to back: one scan

```mermaid
sequenceDiagram
    actor You
    participant V as Views<br/>(IsbnCamera, LibraryPrompts)
    participant M as LibraryAppModel<br/>(view model)
    participant C as LibraryController
    participant U as Use cases<br/>(Lookup / ScanBook)
    participant L as IsbnLookup<br/>(Caching → Merged)
    participant DM as Domain<br/>(Book, PersonalLibrary)
    participant R as BookRepository<br/>(SQLite / JSON)

    You->>V: scan barcode
    V->>M: scan(isbn)
    M->>C: lookup(isbn)
    C->>U: LookupIsbnUseCase.execute
    U->>L: byIsbn(isbn)
    Note over L: cache hit, or Google + Open Library in parallel,<br/>merged field by field, every cover kept
    L-->>M: BookMetadata → ScanDraft
    M-->>V: confirm popup: covers + "Your photo"
    You->>V: pick cover · binding · shelf · purchased/gifted · read
    V->>M: confirmScan / chooseFormat / chooseScanShelf / …
    M->>C: scan(metadata, shelf, status, acquisition, choices)
    C->>U: ScanBookUseCase.execute
    U->>R: loadLibrary
    alt ISBN already owned
        U->>DM: book.addCopy()
    else new ISBN
        U->>DM: new Book → acquire(Purchase or Gift) → library.addBook (checks rules)
    end
    U->>R: save(book) via BookRowMapper
    M-->>V: reload LibraryView, flash "Added …" (Observable → React redraws)
```

The other actions follow the same path through different use cases:

| You tap… | View model method | Use case | Domain method |
|---|---|---|---|
| Move to Owned / Wanted | `moveSelected` | `MoveBookToShelfUseCase` | `acquire()` + `moveTo()` |
| Mark read / unread | `toggleReading` | `SetReadingStatusUseCase` | `setReadingStatus()` |
| Photograph my cover | `changeCover` | `ChangeCoverUseCase` | `changeCover()` |
| Delete | `confirmDelete` | `DeleteBookUseCase` | `library.remove()` |
| (app start) | `start` | `FillMissingFactsUseCase` | `fillFacts()` |

---

## 5. The scan popups as a state machine

```mermaid
stateDiagram-v2
    [*] --> Confirm: lookup found the book
    Confirm --> Saved: already owned → +1 copy
    Confirm --> Binding: binding unknown
    Confirm --> Shelf: binding known
    Binding --> Shelf: hardcover / paperback
    Shelf --> Acquire: Owned
    Shelf --> Reading: Wanted
    Acquire --> GiftName: Gifted
    Acquire --> Reading: Purchased
    GiftName --> Reading: name entered
    Reading --> Saved: read / unread
    Confirm --> NothingAdded: Not this book
    Binding --> NothingAdded: Cancel
    Shelf --> NothingAdded: Cancel
    Acquire --> NothingAdded: Cancel
    Reading --> NothingAdded: Cancel
    Saved --> [*]
    NothingAdded --> [*]
```

Each popup is one `Prompt` value in `LibraryAppModel`'s state. The choice popups carry **what to do next** (`onChoose` / `onCancel`), so the same "How did you get it?" and "Have you read it?" popups also serve the **Wanted → Owned** move.

---

## 6. How the exact edition is found (the data pipeline)

```mermaid
flowchart LR
    use["LookupIsbnUseCase<br/>knows only IsbnLookup"] --> cache["CachingIsbnLookup<br/>(decorator)"]
    cache -- miss --> merged["MergedIsbnLookup<br/>(decorator)"]
    cache -- hit --> store[("lookup cache<br/>in the repository")]
    merged --> google["GoogleBooksIsbnLookup<br/>API volume that lists this ISBN<br/>+ cover-by-ISBN image"]
    merged --> openlib["OpenLibraryIsbnLookup<br/>edition record first,<br/>then work / search fill gaps"]
    google --> http["Http"]
    openlib --> http
```

- **Merge:** for each field, the first source that knows it wins (Google, then Open Library); the binding comes from Open Library. **Every distinct cover becomes a candidate**, and you tap the one that matches your copy or photograph it.
- **Failures:** if one source fails (offline, no key, quota), the other answers. If both fail, you see "No book found" or a network error.
- **No key:** `CompositionRoot` simply leaves Google out.

---

## 6b. Signing in and syncing (core feature 4)

**In plain words:** your phone always keeps its own copy of your library, and that is what you see. Supabase keeps your account's copy. Syncing compares the two **book by book**: whichever copy changed last wins, on both sides. Deleting a book doesn't erase its row; it marks it deleted (a *tombstone*), so the deletion reaches your other phones instead of the book coming back from them.

- **Sign in:** `AccountModel` → `SignInUseCase` (checks the email and password with `Credentials` first) → `Accounts` (Supabase Auth). Then `SyncLibraryUseCase.signedIn()` downloads the account's books, moves any books kept on this phone into the account (a book in both adds its copies), and uploads the result.
- **After every change:** the library model asks `AccountModel.sync()`, which uploads what changed.
- **Auto sync:** `SupabaseLibraryBackup.watch()` listens through Supabase Realtime. When another phone changes your library, this phone syncs and the shelves reload without a tap. It also syncs when the app comes back on screen.
- **Offline:** the phone keeps working; the sync waits ("Saved on this phone. It will sync when you're back online.") and catches up next time.
- **Signed out:** the shelves are empty and Scan is off; signing in shows your books again.
- **Privacy:** the table has row level security, so a signed-in account can only read and write rows with its own id. The app ships only the public (publishable) key.

**Known issue (outstanding):** a delete made in the browser reached the other device only after tapping **Sync now**.

---

## 7. The class map (OOP at a glance)

```mermaid
classDiagram
    direction LR
    class AcquisitionRecord { <<abstract>> +isComplete()* +describe()* }
    AcquisitionRecord <|-- Purchase
    AcquisitionRecord <|-- Gift
    PersonalLibrary "1" *-- "*" Book
    Book *-- AcquisitionRecord

    class LibraryUseCase { <<abstract>> #updateBook() }
    class LibraryLookupUseCase { <<abstract>> #tryFillFacts() }
    LibraryUseCase <|-- LibraryLookupUseCase
    LibraryLookupUseCase <|-- ScanBookUseCase
    LibraryLookupUseCase <|-- FillMissingFactsUseCase
    LibraryUseCase <|-- MoveBookToShelfUseCase
    LibraryUseCase <|-- ChangeCoverUseCase

    class BookRepository { <<interface>> }
    class IsbnLookup { <<interface>> }
    BookRepository <|.. SqliteBookRepository
    BookRepository <|.. JsonBookRepository
    JsonBookRepository *-- MemoryBookRepository
    IsbnLookup <|.. OpenLibraryIsbnLookup
    IsbnLookup <|.. GoogleBooksIsbnLookup
    IsbnLookup <|.. MergedIsbnLookup
    IsbnLookup <|.. CachingIsbnLookup

    class AccountUseCase { <<abstract>> #accounts }
    AccountUseCase <|-- SignInUseCase
    AccountUseCase <|-- SignUpUseCase
    AccountUseCase <|-- SignOutUseCase
    class Accounts { <<interface>> }
    class LibraryBackup { <<interface>> }
    class SyncStore { <<interface>> }
    Accounts <|.. SupabaseAccounts
    Accounts <|.. UnconfiguredAccounts
    LibraryBackup <|.. SupabaseLibraryBackup
    SyncStore <|.. SqliteBookRepository
    SyncLibraryUseCase --> SyncStore
    SyncLibraryUseCase --> LibraryBackup

    class Observable { <<abstract>> #setState() }
    Observable <|-- LibraryAppModel
    Observable <|-- AccountModel
    LibraryAppModel o-- AccountModel
    class DeviceFamily { <<interface>> }
    DeviceFamily <|.. PhoneDevices
    DeviceFamily <|.. BrowserDevices
    LibraryAppModel --> LibraryController
    LibraryAppModel --> DeviceFamily
    class CatalogGrouping { <<abstract>> #sectionOf()* }
    CatalogGrouping <|-- TitleLetterGrouping
    CatalogGrouping <|-- AuthorGrouping
    CatalogGrouping <|-- SeriesGrouping
```

(Simplified: not every use case is drawn.)

---

## 8. The requirement, and how the code meets it

> *Classes for modularity and no duplication, bundling data and behavior into reusable blueprints; all applicable OOP techniques; stylesheets as imports; the whole project modular and duplication-free.*

| Requirement | How it's met | Point to |
|---|---|---|
| Classes bundle data + behavior | Every concept is a class with private state and the methods that change it | `Book`, `PersonalLibrary`, every use case, every repository, `LibraryAppModel` |
| Encapsulation | Fields are private; they change only through rule-checking methods | `Book.acquire()` / `moveTo()` |
| Abstraction | Abstract base classes and interfaces | `AcquisitionRecord`, `LibraryUseCase`, `AccountUseCase`, `Observable`; `BookRepository`, `IsbnLookup`, `IsbnCache`, `SyncStore`, `LibraryBackup`, `Accounts`, `CoverCamera`, `Feedback`, `DeviceFamily` |
| Inheritance (two levels) | Shared code lives once, in the parent | `ScanBookUseCase` → `LibraryLookupUseCase` → `LibraryUseCase` |
| Polymorphism / overriding | One call, behavior chosen by the class | `acquisition.describe()`; `Gift.giftedBy`; `TitleLetterGrouping.order()` |
| Composition | Built from parts | `PersonalLibrary` has Books; the model has a controller and a camera |
| Design patterns | — | Template Method, Strategy, Decorator, Abstract Factory (device families), Simple Factory (`UseCases`, `AccountUseCases`, `AcquisitionRecord.restore`), Null Object (`UnconfiguredAccounts`, `UnconfiguredLibraryBackup`), Repository + Data Mapper, Observer / MVVM, Dependency Injection, Composition Root |
| Modularity | One class per file, folders by tier and role, tiers talk through interfaces | §1, §3 |
| No duplication | Each piece of logic has one home: `updateBook`, `tryFillFacts`, `MergedIsbnLookup`, `Http`, `BookRowMapper`, `UseCases`, `run()`, `PromptActions`, `Labels`, `theme.ts`, `fonts.ts`, `Tappable`, `Reveal`, `fixtures.ts` | — |
| Stylesheets are imports | Each component imports `styles/<name>.styles.ts`; runtime sizes are small functions in that file. No color, font size or icon size is typed outside `theme.ts`. | Enforced by `architecture.test.ts` |

**The only functions that aren't classes:**
- **React components:** React treats class components as legacy, and hooks need functions. They hold no logic (MVVM).
- **`useObservable`:** the one-line hook.
- **Small dynamic style helpers** inside `styles/`.

---

## 9. Quick answers

| Question | Answer |
|---|---|
| Where is the business logic? | `domain/` (`Book`, `PersonalLibrary`, `Gift.isComplete`). Use cases only orchestrate. |
| Why can't Wanted jump to Owned? | `Book.moveTo(OWNED)` → `assertAcquired()` → `NotAcquiredError`. |
| How would you swap the database? | Write a class that implements `BookRepository` and pick it in `CompositionRoot`. Nothing else changes. |
| How do you test without a phone or network? | Inject `MemoryBookRepository`, `FakeIsbnLookup` and `FakeDevices` (a fake camera and feedback; `tests/fixtures.ts`). Screen flows run in `appModel.test.ts`. |
| Why two book sources? | Open Library is free but often has the wrong cover for a printing; Google often has the right one (ADR-006). |
| Why ask which cover is yours? | One ISBN can carry different cover designs (print-on-demand reprints), so only you can confirm. |
| Why is the view model separate from the controller? | The model owns the screen (popups, flash, busy); the controller adapts intents to use cases. Each is tested alone. |
| What happens with a typo in the ISBN? | `Isbn.parse` checks the check digit first and throws `InvalidIsbnError` ("… is not a valid ISBN"), so nothing goes to the network (ADR-010). |
| What if the book sources are down or slow? | `Http` gives up after 15 s, and every network failure (offline, 429, 500, broken JSON) becomes one `BookSourceUnavailableError`. One source failing is fine; all failing shows a red "Couldn't reach the book sources" banner. |
| What if the saved library is damaged? | `BookRowMapper.withDefaults` repairs each row (unknown values fall back to safe defaults), rows with no owner or ISBN are skipped, and an unreadable browser save is backed up instead of crashing the app. |
| Can two owners have the same book? | Yes: every repository keys rows by owner and ISBN together, and SQLite enforces `UNIQUE (owner_id, isbn)`. |
| Which creational patterns does it use? | One, where it removes a real problem: **Abstract Factory** for the device services (`DeviceFamily`: `PhoneDevices` / `BrowserDevices`), so the camera and the feedback always match the platform and the "phone or browser?" check lives in one place. The other four have honest "no fit" lines in [`pattern-map.md`](pattern-map.md). |
| Why email accounts and not Google sign-in? | Google sign-in needs a custom native build, which is not free on iPhone; Supabase email sign-in runs inside Expo Go on both phones (ADR-012). |
| What if two phones change the same book? | The later change wins (by each phone's clock); the other is overwritten. A version older than the stored one is never applied, so an edit made during a sync is kept. |
| Why must you sign in to see books? | The library lives in your account, so the app shows nothing until it knows whose library it is. Books kept on a phone from before move into the account on the first sign-in. |
| Is the Supabase key in the repo a secret? | No: it is the public (publishable) key, meant to ship in apps. Row level security keeps each account to its own rows. The secret and `service_role` keys are never used. |
| What isn't built yet? | Password reset (the free Supabase plan can't put a code in the reset email), and the printing number (reprints share an ISBN). The camera and the two-phone sync are checked by hand on phones. |

`npm test` runs **195 tests** in 15 files: one or more per tier, the repository, cache and sync contracts against memory, JSON and a real SQLite database (Node's built-in `node:sqlite`), the failure cases, one file that drives each core feature end to end (`coreFeatures.test.ts`), two phones syncing (`sync.test.ts`), the Account tab (`accountModel.test.ts`), the Supabase adapters against fakes, and the architecture rules.


---

## 10. Why these choices?

### Why this architecture (a four-tier modular monolith with ports)?

- **It is what the course asks for, done for real.** The slides' Presentation / Service / Domain / Data tiers are four folders, and the C4 diagrams in the README are drawn from them.
- **Monolith, because it is one app for one person, running on one phone.** Splitting it into services would add servers, network calls, and deployment with no benefit: the library is private and works offline.
- **Modular, because each part can be understood and tested alone.** Dependencies only point down, and a test enforces it.
- **Ports (interfaces), because the rules should not care where data lives.** The use cases depend on `BookRepository` and `IsbnLookup`, not on SQLite or a website. That is why all 195 tests run in seconds with in-memory fakes, why Google Books could be added in Sprint 6 without changing a single use case, and why account sync arrived as new ports and adapters without changing the library use cases (ADR-009, ADR-012).
- **MVVM, because screen logic is logic too.** Putting it in the `LibraryAppModel` class means every user flow is tested without drawing a screen, and the React components stay simple.
- **The trade-off:** more files and one extra hop per tap than a single-file app. For a project that is reviewed and graded on its design, that clarity is worth it.

### Why an Expo Go app?

- **The review partner has to run it without a Mac.** A native iPhone app needs Xcode, which only runs on a Mac, plus a paid developer account. Expo Go is a free app on both iPhone and Android: run `npm start`, scan the QR code, and MyHomeLib opens (ADR-001, ADR-005).
- **It still gets the phone's features.** Expo Go already includes the camera barcode scanner, SQLite, image loading, gradients, fonts, and haptics, so no native code has to be compiled.
- **There is a fallback.** The same code runs in a web browser (press `w`), which is useful for a conference demo.
- **One codebase for iPhone, Android, and web**, instead of writing the app twice in Swift and Kotlin.
- **The trade-off:** only the modules bundled in Expo Go can be used, and the app is not in the App Store. Neither matters for this course.

### Why TypeScript?

- **It is the language of React Native and Expo.** JavaScript is required; TypeScript is JavaScript with types, and Expo supports it out of the box.
- **It has real OOP tools.** Classes, interfaces, abstract classes, and `private` / `protected` are what the course's OOP requirement and the UML class diagram describe, so the diagrams match the code honestly.
- **It catches mistakes before the app runs.** If a repository forgets a method of `BookRepository`, or a screen passes the wrong type, the compiler refuses to build. Enums (`Shelf`, `ReadingStatus`) make invalid values impossible.
- **One language everywhere:** all four tiers and the tests (Jest) share it, so there is no translation layer between parts.
- **Alternatives considered:** plain JavaScript (no interfaces or compile-time checks), Swift + Kotlin (two codebases and a Mac), Python + Flask (not a mobile app; ADR-001).

### Follow-ups you might be asked

| Question | Answer |
|---|---|
| Why SQLite? | The course allows one data store, and SQLite is built into the phone and Expo Go: no server, works offline (ADR-002). It stays the working copy; the Supabase table is a synced copy of it, recorded as a second store in ADR-012. |
| Why not a backend server? | Nothing needs to be shared between users, so a server of our own would only add cost and failure points. Account sync (core feature 4) uses Supabase, a hosted service, through its official client and row level security (ADR-012). |
| Why classes in the view model but functions for components? | React components are functions by design (class components are legacy, and hooks need functions). They hold no logic, so nothing is lost. |
| Why Google Books if the course limited integrations? | Open Library alone often showed the wrong cover for a printing. Google is official, optional (free key), and plugged in behind the same port (ADR-006). |
