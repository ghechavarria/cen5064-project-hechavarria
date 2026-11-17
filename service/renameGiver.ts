/**
 * Service: RenameGiverUseCase — rename the person behind a set of gifts: every
 * Owned book gifted by `from` (name matched without case) becomes gifted by
 * `to`. Renaming to someone already in the library joins the two. The domain
 * keeps the rules: a gift needs a name, and only an Owned book records one.
 */
import { Acquisition, Gift } from "../domain";
import { GiftSourceRequiredError } from "../domain/exceptions";
import { LibraryUseCase } from "./libraryUseCase";

export class RenameGiverUseCase extends LibraryUseCase {
  /** Returns how many books now carry the new name. */
  async execute(ownerId: string, from: string, to: string): Promise<number> {
    const gift = new Gift(to);
    const key = from.trim().toLowerCase();
    const gifts = (await this.library(ownerId)).books.filter(
      (book) => book.acquiredAs === Acquisition.GIFTED && book.giftedBy?.trim().toLowerCase() === key,
    );
    if (!gift.isComplete()) {
      throw new GiftSourceRequiredError(gifts[0]?.isbn ?? "");
    }
    for (const book of gifts) {
      book.changeAcquisition(gift);
      await this.repository.save(ownerId, book);
    }
    return gifts.length;
  }
}
