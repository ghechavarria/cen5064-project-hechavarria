# Code review walkthrough

This is the narrative architecture doc. Mermaid diagrams live in [`README.md`](../README.md). Why-decisions live in [`docs/adr/`](adr/).

## Why this shape

MyHomeLib is an **Expo Go 4-tier modular monolith** so a partner clones the repo, runs `npm start`, and opens Expo Go — no Mac, no Xcode, no paid store account ([ADR-001](adr/adr-001.md), [ADR-005](adr/adr-005.md)).

**Open Library** is the only Context external: $0, no API key, one outbound HTTP client in Data ([ADR-003](adr/adr-003.md), [ADR-004](adr/adr-004.md)). SQLite is an internal store, not a Context system ([ADR-002](adr/adr-002.md)).

**TBR is a view of Owned**, not a third exclusive shelf. Owned + unread is the to-be-read list; Owned + read is finished. Wanted is the other shelf.

Calls go **Presentation → Service → Domain / Repository**, never backwards. [`bootstrap.ts`](../bootstrap.ts) is the composition root (not a fifth tier): it opens SQLite or JSON and builds `IsbnLookup`. Presentation screens import bootstrap + Service, never `data/*`.

## Dependency rule (Scan proves it)

1. Presentation (`IsbnCamera`) reads a barcode and calls `LookupIsbnUseCase` only — **no save**.
2. Service asks the `IsbnLookup` port; Data (`OpenLibraryIsbnLookup`) does HTTP and returns metadata.
3. UI shows a cover confirm popup. Deny: nothing is persisted; stay on Scan.
4. Confirm: Presentation calls `ScanBookUseCase`, which loads the library, applies Domain (`addCopy` vs new `Book`), then `BookRepository.save`.

Presentation never `fetch`es Open Library. Service never imports React, SQLite, or `fetch`. Domain never imports React, SQLite, or HTTP.

## Folder / file map

| Path | What it does / must not do |
|------|----------------------------|
| `index.ts` | Registers the Presentation `App`. No use-case logic. |
| `bootstrap.ts` | Composition root. Opens SQLite or JSON and `createIsbnLookup`. Not a C4 container. |
| `presentation/App.tsx` | Screens. Calls `openRepository` / use cases; must not import `data/*` or call `fetch` / SQL. |
| `presentation/MenuBar.tsx` | TBR / Owned / Wanted / Scan tabs. No I/O. |
| `presentation/IsbnCamera.tsx` | Camera / webcam barcode. Hands ISBN to App; does not save. |
| `presentation/PromptModal.tsx` | Confirm / choice / text popups (cover, gift, delete). No I/O. |
| `presentation/OwnedCatalog.tsx` | Owned list grouped A–Z / author / series. View only. |
| `presentation/BookCard.tsx` | One book row. No I/O. |
| `presentation/SeriesStack.tsx` | Stacked covers for a shared series. No I/O. |
| `presentation/Art.tsx` | Forest background and wood nav images. No I/O. |
| `presentation/theme.ts` | Dark forest colors. No I/O. |
| `presentation/catalog.ts` | Groups books for the Owned catalog. No I/O. |
| `service/index.ts` | Use-case barrel. Presentation imports from here. |
| `service/ports.ts` | `IsbnLookup` and `BookRepository` interfaces. No React / SQLite / `fetch`. |
| `service/lookupIsbn.ts` | Metadata only; **does not save**. |
| `service/scanBook.ts` | Persist after confirm; duplicate ISBN → `addCopy`. |
| `service/moveBook.ts` | Wanted → Owned after Domain acquisition rules. |
| `service/setReadingStatus.ts` | UNREAD / READ on an existing book. |
| `service/deleteBook.ts` | `get` then repository `delete`. |
| `service/fillMissingFacts.ts` | Backfill empty series from Open Library. |
| `domain/index.ts` | `Book`, `PersonalLibrary`, enums. No React / SQLite / HTTP. |
| `domain/exceptions.ts` | Typed Domain errors. Same forbidden imports. |
| `data/isbnLookup.ts` | `OpenLibraryIsbnLookup` / `FakeIsbnLookup` — the only HTTP. |
| `data/bookRepository.ts` | Memory / JSON adapters and row mapping. |
| `data/sqliteRepository.ts` | Phone SQLite adapter. Only `bootstrap.ts` opens it; Service must not import `expo-sqlite`. |
| `tests/domain.test.ts` | Copy count, Wanted→Owned, gift source. |
| `tests/useCases.test.ts` | Service use cases against memory / fake Data. |
| `tests/catalog.test.ts` | A–Z / author / series grouping. |
| `assets/` | `forest-bg.png`, `wood-nav-strip.png` used by Presentation. |
| `scripts/start-expo.cjs` | `npm start` — Expo CLI with a printable QR code. |

## Walk me through Scan / move / delete

**Scan.** Camera (or typed ISBN) → `LookupIsbnUseCase` → cover popup. Confirm → shelf + read/unread (skipped if the ISBN is already cataloged) → `ScanBookUseCase`. Duplicate ISBN: Domain `addCopy` (one row, higher `copyCount`). New ISBN: `PersonalLibrary.addBook` then save. Result appears on TBR (Owned) or Wanted.

**Move.** Detail → Wanted to Owned. UI asks purchased or gifted; gifted needs a name. `MoveBookToShelfUseCase` calls `markPurchased` / `markGifted` then `Book.moveTo`. Domain throws if acquisition is missing.

**Delete.** Detail → confirm popup → `DeleteBookUseCase` (`get` so a missing ISBN is a Domain error, then repository `delete`).

## README Mermaid

C4 Context, Container, UML class, and the Scan sequence are in the README (not here). There is no C4 Component or Code diagram.

- Context: one system, the bibliophile, Open Library. No SQLite or shelves.
- Container: four boxes matching the Lecture 1 table (Presentation, Service, Domain, Data). No extra SQLite cylinder. Arrows only UI → Service → Domain and Service → Data.
- Class: four types — `PersonalLibrary`, `Book`, `Shelf`, `ReadingStatus`. Acquisition is an attribute on `Book`, not a fifth class.
- Sequence: one use case. `->>` is a call; `-->>` is a return. `S->>S: addCopy` plus a note is the duplicate-ISBN Domain rule.
