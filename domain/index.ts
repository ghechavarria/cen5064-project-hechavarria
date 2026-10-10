/**
 * Domain barrel: Book, PersonalLibrary, AcquisitionRecord (Purchase / Gift),
 * Isbn, and the enums. Other tiers import the domain from here.
 */
export { AcquisitionRecord, Gift, Purchase } from "./acquisition";
export { Book } from "./book";
export type { BookFacts, BookProps } from "./book";
export { Acquisition, BookFormat, ReadingStatus, Shelf } from "./enums";
export { Isbn } from "./isbn";
export { PersonalLibrary } from "./personalLibrary";
