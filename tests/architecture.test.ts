/// <reference types="node" />
/**
 * Tests: the tier dependency rule from the Container diagram, plus the
 * presentation layout rules (styles in their own files, only App wires bootstrap).
 * Calls flow Presentation → Service → Domain / Data ports, never backwards.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");

type Source = { file: string; text: string };

// Every .ts / .tsx file under a folder, including subfolders.
function sources(folder: string): Source[] {
  return readdirSync(join(ROOT, folder)).flatMap((name): Source[] => {
    const path = `${folder}/${name}`;
    if (statSync(join(ROOT, path)).isDirectory()) {
      return sources(path);
    }
    return /\.tsx?$/.test(name) ? [{ file: path, text: readFileSync(join(ROOT, path), "utf8") }] : [];
  });
}

function imports(text: string): string[] {
  return [...text.matchAll(/from "([^"]+)"/g)].map((match) => match[1]);
}

// Fails with the file name in the message, so a broken rule says where.
function expectNone(file: string, found: unknown[]): void {
  expect({ file, found }).toEqual({ file, found: [] });
}

test("domain imports nothing outside domain", () => {
  for (const { file, text } of sources("domain")) {
    expectNone(file, imports(text).filter((path) => !path.startsWith("./")));
  }
});

test("service imports only domain and its own ports", () => {
  for (const { file, text } of sources("service")) {
    expectNone(
      file,
      imports(text).filter((path) => !path.startsWith("./") && !path.startsWith("../domain")),
    );
    expectNone(file, text.match(/\bfetch\(/g) ?? []);
  }
});

test("data never depends on presentation or React", () => {
  for (const { file, text } of sources("data")) {
    expectNone(
      file,
      imports(text).filter(
        (path) => path.includes("presentation") || path === "react" || path === "react-native",
      ),
    );
  }
});

test("presentation talks to use cases, never to data or repository ports", () => {
  for (const { file, text } of sources("presentation")) {
    expectNone(file, imports(text).filter((path) => path.includes("/data")));
    expectNone(file, text.match(/\b(BookRepository|IsbnLookup)\b/g) ?? []);
    expectNone(file, text.match(/\bfetch\(/g) ?? []);
  }
});

test("styles live in presentation/styles: no stylesheets or style literals in components", () => {
  for (const { file, text } of sources("presentation")) {
    if (!file.startsWith("presentation/styles/")) {
      expectNone(file, text.match(/StyleSheet\.create/g) ?? []);
      expectNone(file, text.match(/style=\{\{/g) ?? []);
    }
  }
});

test("only App.tsx reaches bootstrap (the composition root)", () => {
  for (const { file, text } of sources("presentation")) {
    if (file !== "presentation/App.tsx") {
      expectNone(file, text.match(/^import \{[^}]*\} from "[./]*bootstrap";$/gm) ?? []);
    }
  }
});
