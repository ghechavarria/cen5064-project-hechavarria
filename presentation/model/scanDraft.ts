/**
 * Presentation model: ScanDraft — a scanned book while the owner is still
 * deciding: what the sources found, which cover matches their copy (one of the
 * sources' covers, or their own photo), and the binding. Immutable: each choice
 * returns a new draft, which keeps the view model's state updates simple.
 */
import { BookFormat } from "../../domain";
import { ScanChoices } from "../../service";
import { BookMetadata } from "../../service/ports";
import { LookupResult } from "./libraryController";

export class ScanDraft {
  private constructor(
    readonly metadata: BookMetadata,
    readonly alreadyInLibrary: boolean,
    readonly covers: string[],
    readonly cover: string,
    readonly format: BookFormat,
  ) {}

  // Starts with the sources' best cover and their binding (if any source knew it).
  static from({ metadata, alreadyInLibrary }: LookupResult): ScanDraft {
    const covers = metadata.coverCandidates.length > 0 ? metadata.coverCandidates : [];
    return new ScanDraft(metadata, alreadyInLibrary, covers, covers[0] ?? "", metadata.format);
  }

  // Pick a cover; a new one (the owner's photo) joins the list.
  withCover(url: string): ScanDraft {
    const covers = this.covers.includes(url) ? this.covers : [...this.covers, url];
    return new ScanDraft(this.metadata, this.alreadyInLibrary, covers, url, this.format);
  }

  withFormat(format: BookFormat): ScanDraft {
    return new ScanDraft(this.metadata, this.alreadyInLibrary, this.covers, this.cover, format);
  }

  // No source recorded hardcover vs paperback, so the owner is asked.
  get needsFormat(): boolean {
    return this.format === BookFormat.UNKNOWN;
  }

  get choices(): ScanChoices {
    return { coverUrl: this.cover, format: this.format };
  }
}
