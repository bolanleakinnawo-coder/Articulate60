// Usage:  node generate-prompts.mjs prompts.txt src/data/prompts
//
// Reads your pasted categories + prompts text and writes:
//   <outDir>/<category-id>.js   -> export default [ ...prompts ]
//   <outDir>/index.js           -> exports CATEGORIES and PROMPTS
//
// Expected text format (what you already have):
//   1.EVERYDAY CONVERSATIONS
//    Practise real-life conversations.        <- category list with descriptions
//   ...
//   EVERYDAY CONVERSATIONS                      <- then one section per category
//   1.What have you been enjoying lately?
//   2.Something you've been looking forward to.

import fs from "node:fs";
import path from "node:path";

const [, , inputFile = "prompts.txt", outDir = "src/data/prompts"] =
  process.argv;

const lines = fs
  .readFileSync(inputFile, "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

const numbered = /^(\d+)\s*\.\s*(.+)$/;
const isHeading = (text) => !/[a-z]/.test(text) && /[A-Z]/.test(text);
const norm = (s) => s.toUpperCase().replace(/\s+/g, " ").trim();
const titleCase = (s) =>
  s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

const defs = new Map(); // NORMALISED TITLE -> { title, description }
const sections = new Map(); // NORMALISED TITLE -> prompts[]
let current = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = line.match(numbered);
  const text = m ? m[2].trim() : line;

  if (isHeading(text)) {
    const key = norm(text);
    const next = lines[i + 1] ?? "";
    if (next && !numbered.test(next)) {
      // heading followed by a plain line = category definition + description
      defs.set(key, { title: titleCase(text), description: next });
      i++;
      current = null;
    } else {
      // heading followed by numbered prompts = start of a section
      current = key;
      if (!sections.has(key)) sections.set(key, []);
    }
    continue;
  }

  if (m && current) sections.get(current).push(text);
}

// ---- checks ----
let problems = 0;
for (const key of sections.keys()) {
  if (!defs.has(key)) {
    console.warn(`! Section "${key}" has no entry in the category list`);
    problems++;
  }
}
const categories = [...defs.entries()].map(([key, d]) => {
  const prompts = sections.get(key) ?? [];
  const id = slug(d.title);
  if (prompts.length !== 100) {
    console.warn(`! ${d.title}: ${prompts.length} prompts (expected 100)`);
    problems++;
  }
  const dupes = prompts.filter((p, idx) => prompts.indexOf(p) !== idx);
  if (dupes.length) {
    console.warn(`! ${d.title}: duplicate prompts -> ${dupes.join(" | ")}`);
    problems++;
  }
  return { id, ...d, prompts };
});

// ---- write files ----
fs.mkdirSync(outDir, { recursive: true });

for (const c of categories) {
  fs.writeFileSync(
    path.join(outDir, `${c.id}.js`),
    `export default ${JSON.stringify(c.prompts, null, 2)};\n`,
  );
}

const imports = categories
  .map((c) => `import ${camel(c.id)} from "./${c.id}.js";`)
  .join("\n");
const catList = categories
  .map(
    (c) =>
      `  { id: ${JSON.stringify(c.id)}, title: ${JSON.stringify(c.title)}, description: ${JSON.stringify(c.description)} },`,
  )
  .join("\n");
const promptMap = categories
  .map((c) => `  ${JSON.stringify(c.id)}: ${camel(c.id)},`)
  .join("\n");

fs.writeFileSync(
  path.join(outDir, "index.js"),
  `${imports}\n\nexport const CATEGORIES = [\n${catList}\n];\n\nexport const PROMPTS = {\n${promptMap}\n};\n`,
);

console.log(
  `Done: ${categories.length} categories, ${categories.reduce((n, c) => n + c.prompts.length, 0)} prompts -> ${outDir}`,
);
if (problems) console.log(`${problems} warning(s) above, please check them.`);
