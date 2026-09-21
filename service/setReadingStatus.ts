/**
 * Service: SetReadingStatusUseCase — UNREAD / READ on an existing Book.
 * Must not import React, SQLite, or fetch.
 */
import { Book, ReadingStatus } from "../domain";
import { BookRepository } from "./ports";

export class SetReadingStatusUseCase {
  constructor(private readonly repository: BookRepository) {}

  async execute(ownerId: string, isbn: string, status: ReadingStatus): Promise<Book> {
    const book = (await this.repository.loadLibrary(ownerId)).get(isbn);
    book.setReadingStatus(status);
    return this.repository.save(ownerId, book);
  }
}
