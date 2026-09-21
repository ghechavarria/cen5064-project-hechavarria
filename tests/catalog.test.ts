/**
 * Tests: Presentation catalog grouping (A–Z / author / series).
 */
import { Book, ReadingStatus, Shelf } from "../domain";
import { catalogSections, titleLetter } from "../presentation/catalog";

function book(title: string, author: string, series = ""): Book {
  return new Book(
    title,
    title,
    author,
    "",
    "",
    Shelf.OWNED,
    1,
    null,
    null,
    ReadingStatus.UNREAD,
    series,
  );
}

test("titleLetter maps digits to hash", () => {
  expect(titleLetter("1984")).toBe("#");
  expect(titleLetter("Matilda")).toBe("M");
});

test("A-Z catalog groups by first letter", () => {
  const sections = catalogSections(
    [book("Matilda", "Roald Dahl"), book("Fantastic Mr Fox", "Roald Dahl")],
    "az",
  );
  expect(sections.map((section) => section.title)).toEqual(["F", "M"]);
});

test("author and series grouping", () => {
  const fox = book("Fantastic Mr Fox", "Roald Dahl", "Fantastic Mr Fox");
  const dune = book("Dune", "Frank Herbert", "");
  expect(catalogSections([fox, dune], "author").map((section) => section.title)).toEqual([
    "Frank Herbert",
    "Roald Dahl",
  ]);
  expect(catalogSections([fox, dune], "series").map((section) => section.title)).toEqual([
    "Fantastic Mr Fox",
    "Standalone",
  ]);
});
