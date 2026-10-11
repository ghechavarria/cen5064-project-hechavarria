/**
 * Tests: Presentation catalog grouping (A–Z / author / series).
 */
import { Book, Shelf } from "../domain";
import { Catalog } from "../presentation/model/catalog";

function book(title: string, author: string, series = ""): Book {
  return new Book({
    isbn: title,
    title,
    author,
    coverUrl: "",
    publisher: "",
    shelf: Shelf.OWNED,
    series,
  });
}

test("letterOf maps digits to hash", () => {
  expect(Catalog.letterOf("1984")).toBe("#");
  expect(Catalog.letterOf("Matilda")).toBe("M");
});

test("A-Z catalog groups by first letter", () => {
  const sections = Catalog.sections(
    [book("Matilda", "Roald Dahl"), book("Fantastic Mr Fox", "Roald Dahl")],
    "az",
  );
  expect(sections.map((section) => section.title)).toEqual(["F", "M"]);
});

test("author and series grouping", () => {
  const fox = book("Fantastic Mr Fox", "Roald Dahl", "Fantastic Mr Fox");
  const dune = book("Dune", "Frank Herbert", "");
  expect(Catalog.sections([fox, dune], "author").map((section) => section.title)).toEqual([
    "Frank Herbert",
    "Roald Dahl",
  ]);
  expect(Catalog.sections([fox, dune], "series").map((section) => section.title)).toEqual([
    "Fantastic Mr Fox",
    "Standalone",
  ]);
});
