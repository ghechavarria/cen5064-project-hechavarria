/**
 * Presentation model: AlphabetRail — the math behind the catalog's A–Z
 * scrubber: which letter a finger is on, where that letter sits (for the
 * bubble), and which section it jumps to. Works for every grouping, because a
 * section's letter is the first letter of its title (a letter, an author, or a series).
 */
import { Catalog, CatalogSection } from "./catalog";

const LETTERS = Catalog.LETTERS;

export class AlphabetRail {
  private box = { y: 0, height: 1 };

  // Where the letter block sits on screen (from measureInWindow).
  measure(y: number, height: number): void {
    this.box = { y, height: Math.max(height, 1) };
  }

  // Every letter has the same height, so each owns an equal slice of the block;
  // a finger above or below the block clamps to the first or last letter.
  letterAt(pageY: number): string {
    const index = Math.floor(((pageY - this.box.y) / this.box.height) * LETTERS.length);
    return LETTERS[Math.min(LETTERS.length - 1, Math.max(0, index))];
  }

  // Middle of a letter's slice, measured from the top of the letter block.
  centerOf(letter: string): number {
    return ((LETTERS.indexOf(letter) + 0.5) * this.box.height) / LETTERS.length;
  }

  // Letters that have at least one section; the rest are drawn dimmed.
  static lettersIn(sections: CatalogSection[]): Set<string> {
    return new Set(sections.map((section) => Catalog.letterOf(section.title)));
  }

  // The first section starting with the letter; if there is none, the last one
  // before it (so "C" with no C books lands on "B").
  static sectionFor(letter: string, sections: CatalogSection[]): number {
    const target = LETTERS.indexOf(letter);
    const position = (section: CatalogSection) => LETTERS.indexOf(Catalog.letterOf(section.title));
    const exact = sections.findIndex((section) => position(section) === target);
    if (exact >= 0) {
      return exact;
    }
    return sections.reduce((best, section, index) => (position(section) < target ? index : best), 0);
  }
}
