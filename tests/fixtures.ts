/**
 * Tests: shared fixtures — one sample book, one memory-backed wiring, and a
 * fake device family (camera + feedback), so every test file builds the app the same way.
 */
import { MemoryBookRepository } from "../data/bookRepository";
import { IsbnNotFoundError } from "../domain/exceptions";
import { BookFormat, Isbn } from "../domain";
import { CoverCamera } from "../presentation/model/coverCamera";
import { DeviceFamily, Feedback } from "../presentation/model/devices";
import { LibraryController } from "../presentation/model/libraryController";
import { UseCases } from "../service";
import { BookMetadata, BookRepository, IsbnLookup } from "../service/ports";

/** Test double for IsbnLookup: answers from a fixed catalog, no network. */
class FakeIsbnLookup implements IsbnLookup {
  constructor(private readonly catalog: Record<string, BookMetadata>) {}

  async byIsbn(isbn: string): Promise<BookMetadata> {
    const metadata = this.catalog[Isbn.normalize(isbn)];
    if (!metadata) {
      throw new IsbnNotFoundError(isbn);
    }
    return metadata;
  }
}

export const FOX: BookMetadata = {
  isbn: "9780140328721",
  title: "Fantastic Mr. Fox",
  author: "Roald Dahl",
  coverUrl: "https://covers.openlibrary.org/b/isbn/9780140328721-M.jpg",
  coverCandidates: [
    "https://covers.openlibrary.org/b/isbn/9780140328721-M.jpg",
    "https://books.google.com/fox.jpg",
  ],
  format: BookFormat.PAPERBACK,
  publisher: "Puffin",
  series: "Fantastic Mr Fox",
  description: "A fox outwits three farmers.",
  published: "1970",
  pageCount: 96,
  subjects: "Animals, Children's stories",
};

/** A lookup that only knows one book (FOX unless told otherwise). */
export function foxLookup(metadata: BookMetadata = FOX): IsbnLookup {
  return new FakeIsbnLookup({ [metadata.isbn]: metadata });
}

/** All use cases over an in-memory repository and the fake FOX lookup. */
export function memoryStack(repository: BookRepository = new MemoryBookRepository()) {
  return { repo: repository, ...new UseCases(repository, foxLookup()) };
}

export function controllerFor(
  repository: BookRepository = new MemoryBookRepository(),
  book: BookMetadata = FOX,
): LibraryController {
  return new LibraryController(new UseCases(repository, foxLookup(book)), "local");
}

/** The photo FakeCoverCamera hands back. */
export const MY_PHOTO = "data:image/jpeg;base64,MY-COVER";

/** Test double for CoverCamera: hands back a fixed photo, or null when "cancelled". */
class FakeCoverCamera implements CoverCamera {
  readonly available = true;

  constructor(private readonly photo: string | null = MY_PHOTO) {}

  async takePhoto(): Promise<string | null> {
    return this.photo;
  }
}

/** Test double for Feedback: records each tick ("selection") and banner ("message" / "error"). */
class FakeFeedback implements Feedback {
  readonly events: string[] = [];

  selection(): void {
    this.events.push("selection");
  }

  message(failed: boolean): void {
    this.events.push(failed ? "error" : "message");
  }
}

/** A device family made of fakes; pass a camera to test refusals or cancels. */
export class FakeDevices implements DeviceFamily {
  readonly feedback = new FakeFeedback();

  constructor(private readonly camera: CoverCamera = new FakeCoverCamera()) {}

  createCoverCamera(): CoverCamera {
    return this.camera;
  }

  createFeedback(): Feedback {
    return this.feedback;
  }
}
