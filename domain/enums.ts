/**
 * Domain: the fixed vocabularies — which shelf, read or not, how acquired, which binding.
 */
export enum Shelf {
  OWNED = "OWNED",
  WANTED = "WANTED",
}

export enum ReadingStatus {
  UNREAD = "UNREAD",
  READ = "READ",
}

export enum Acquisition {
  PURCHASED = "PURCHASED",
  GIFTED = "GIFTED",
}

// Publishers give each binding its own ISBN, so the format belongs to the edition.
export enum BookFormat {
  HARDCOVER = "HARDCOVER",
  PAPERBACK = "PAPERBACK",
  UNKNOWN = "UNKNOWN",
}
