/**
 * Domain: Isbn — the one place that decides what a usable ISBN key looks like,
 * whether a number really is an ISBN (its check digit adds up), and that the
 * library keys every book by its ISBN-13.
 */
import { InvalidIsbnError } from "./exceptions";

export class Isbn {
  // "ISBN 978-0-14-032872-1" and "9780140328721" are the same book: keep digits
  // and the ISBN-10 check character X only.
  static normalize(raw: string): string {
    return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
  }

  // A normalized ISBN-13 (978/979 prefix) or ISBN-10 whose check digit is correct.
  static isValid(raw: string): boolean {
    const isbn = Isbn.normalize(raw);
    if (/^97[89]\d{10}$/.test(isbn)) {
      return Isbn.checksum13(isbn) === Number(isbn[12]);
    }
    if (/^\d{9}[\dX]$/.test(isbn)) {
      return Isbn.weightedSum10(isbn) % 11 === 0;
    }
    return false;
  }

  // The library key (always ISBN-13), or InvalidIsbnError for a typo or a non-book barcode.
  static parse(raw: string): string {
    if (!Isbn.isValid(raw)) {
      throw new InvalidIsbnError(raw.trim());
    }
    return Isbn.canonical(raw);
  }

  // One key per book: a valid ISBN-10 becomes its ISBN-13 (978 + the first nine
  // digits + a new check digit), so typing "0-14-032872-6" and scanning the
  // barcode 9780140328721 find the same book. Anything else is returned normalized.
  static canonical(raw: string): string {
    const isbn = Isbn.normalize(raw);
    if (!/^\d{9}[\dX]$/.test(isbn) || !Isbn.isValid(isbn)) {
      return isbn;
    }
    const twelve = `978${isbn.slice(0, 9)}`;
    return `${twelve}${Isbn.checksum13(twelve)}`;
  }

  // ISBN-13: digits weighted 1, 3, 1, 3, …; the check digit tops the sum up to a multiple of 10.
  private static checksum13(isbn: string): number {
    const sum = [...isbn.slice(0, 12)].reduce((total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10;
  }

  // ISBN-10: digits weighted 10 down to 1 (X = 10); a valid ISBN sums to a multiple of 11.
  private static weightedSum10(isbn: string): number {
    return [...isbn].reduce((total, char, i) => total + (char === "X" ? 10 : Number(char)) * (10 - i), 0);
  }
}
