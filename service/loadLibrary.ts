/**
 * Service: LoadLibraryUseCase — read the owner's PersonalLibrary for display.
 */
import { PersonalLibrary } from "../domain";
import { LibraryUseCase } from "./libraryUseCase";

export class LoadLibraryUseCase extends LibraryUseCase {
  execute(ownerId: string): Promise<PersonalLibrary> {
    return this.library(ownerId);
  }
}
