/**
 * Domain: typed errors, one per broken rule (unknown ISBN, missing book, duplicate,
 * no purchase or gift, gift without a giver). The view model shows their messages.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BookNotFoundError extends DomainError {
  constructor(isbn: string) {
    super(`No book with ISBN ${isbn} in this library`);
  }
}

export class DuplicateIsbnError extends DomainError {
  constructor(isbn: string) {
    super(`ISBN ${isbn} is already in your library`);
  }
}

export class IsbnNotFoundError extends DomainError {
  constructor(isbn: string) {
    super(`No book found for ISBN ${isbn}`);
  }
}

export class NotAcquiredError extends DomainError {
  constructor(isbn: string) {
    super(
      `Book ${isbn} must be marked purchased or gifted before it can be Owned`,
    );
  }
}

export class GiftSourceRequiredError extends DomainError {
  constructor(isbn: string) {
    super(`Gifted book ${isbn} needs the name of the person who gifted it`);
  }
}
