/**
 * Service: MoveBookToShelfUseCase — Wanted → Owned after Domain acquisition rules.
 * Must not import React, SQLite, or fetch.
 */
import { Acquisition, Book, Shelf } from "../domain";
import { BookRepository } from "./ports";

export class MoveBookToShelfUseCase {
  constructor(private readonly repository: BookRepository) {}

  async execute(
    ownerId: string,
    isbn: string,
    targetShelf: Shelf,
    acquisition?: { type: Acquisition; giftedBy?: string },
  ): Promise<Book> {
    const book = (await this.repository.loadLibrary(ownerId)).get(isbn);
    if (acquisition?.type === Acquisition.PURCHASED) {
      book.markPurchased();
    }
    if (acquisition?.type === Acquisition.GIFTED) {
      book.markGifted(acquisition.giftedBy ?? "");
    }
    book.moveTo(targetShelf);
    return this.repository.save(ownerId, book);
  }
}
