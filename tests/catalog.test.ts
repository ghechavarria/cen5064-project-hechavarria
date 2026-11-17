/**
 * Tests: Presentation catalog grouping (A–Z / author / series).
 */
import { Book, Gift, Purchase, Shelf } from "../domain";
import { AlphabetRail } from "../presentation/model/alphabetRail";
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

test("Gifts lists only gifted books, under who gave them; with none, its own empty message", () => {
  const gift = (title: string, giver: string) =>
    new Book({ isbn: title, title, author: "A", coverUrl: "", publisher: "", shelf: Shelf.OWNED, acquisition: new Gift(giver) });
  const bought = new Book({ isbn: "b", title: "Bought", author: "A", coverUrl: "", publisher: "", shelf: Shelf.OWNED, acquisition: new Purchase() });
  const sections = Catalog.sections([gift("Matilda", "Grandma"), bought, gift("Dune", "Ellie"), gift("Emma", "Ellie")], "gifts");
  expect(sections.map((section) => [section.title, section.data.map((book) => book.title)])).toEqual([
    ["From Ellie", ["Dune", "Emma"]],
    ["From Grandma", ["Matilda"]],
  ]);
  expect(Catalog.sections([bought], "gifts")).toEqual([]);
  expect(Catalog.grouping("gifts").empty.title).toBe("No gifts yet");
});

test("every grouping files its sections for the A–Z rail; Gifted by the giver's name, not 'From'", () => {
  const gift = (title: string, giver: string) =>
    new Book({ isbn: title, title, author: "A", coverUrl: "", publisher: "", shelf: Shelf.OWNED, acquisition: new Gift(giver) });
  const sections = Catalog.sections([gift("Matilda", "Grandma"), gift("Dune", "Ellie")], "gifts");
  expect(sections.map((section) => [section.title, section.letter])).toEqual([
    ["From Ellie", "E"],
    ["From Grandma", "G"],
  ]);
  expect(AlphabetRail.sectionFor("G", sections)).toBe(1);
  expect(Catalog.sections([book("1984", "George Orwell")], "az")[0].letter).toBe("#");
});
