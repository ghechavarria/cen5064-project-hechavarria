/**
 * Domain: Isbn — the one place that decides what a usable ISBN key looks like.
 */
export class Isbn {
  // "978-0-14-032872-1" and "9780140328721" are the same book: keep letters and digits only.
  static normalize(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  }
}
