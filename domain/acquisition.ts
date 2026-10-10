/**
 * Domain: AcquisitionRecord and its subclasses Purchase and Gift.
 * Inheritance + polymorphism: each subclass answers isComplete() / describe()
 * itself, so no caller needs an if/else on the acquisition type.
 */
import { Acquisition } from "./enums";

/**
 * How an Owned book was acquired. Abstract base; each subclass decides
 * polymorphically whether it is complete and how it reads.
 */
export abstract class AcquisitionRecord {
  abstract readonly kind: Acquisition;

  get giftedBy(): string | null {
    return null;
  }

  abstract isComplete(): boolean;

  abstract describe(): string;

  // Factory: rebuild the right subclass from stored columns.
  static restore(kind: Acquisition | null, giftedBy: string | null): AcquisitionRecord | null {
    if (kind === Acquisition.PURCHASED) {
      return new Purchase();
    }
    if (kind === Acquisition.GIFTED) {
      return new Gift(giftedBy ?? "");
    }
    return null;
  }
}

export class Purchase extends AcquisitionRecord {
  readonly kind = Acquisition.PURCHASED;

  isComplete(): boolean {
    return true;
  }

  describe(): string {
    return "Purchased";
  }
}

export class Gift extends AcquisitionRecord {
  readonly kind = Acquisition.GIFTED;
  private readonly giver: string;

  constructor(giver: string) {
    super();
    this.giver = giver.trim();
  }

  override get giftedBy(): string | null {
    return this.giver || null;
  }

  // A gift needs the giver's name.
  isComplete(): boolean {
    return this.giver.length > 0;
  }

  describe(): string {
    return `Gifted by ${this.giver}`;
  }
}
