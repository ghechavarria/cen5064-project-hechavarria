/**
 * Service: DeleteBookUseCase — remove a Book after Domain get() confirms it exists.
 * Must not import React, SQLite, or fetch.
 */
import { BookRepository } from "./ports";

export class DeleteBookUseCase {
  constructor(private readonly repository: BookRepository) {}

  async execute(ownerId: string, isbn: string): Promise<void> {
    (await this.repository.loadLibrary(ownerId)).get(isbn);
    return this.repository.delete(ownerId, isbn);
  }
}
