
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ajv = new Ajv({ strict: false, allowUnionTypes: true, allErrors: true });
addFormats(ajv);

const schemas = {
  glyphs: JSON.parse(await readFile(resolve("src/chambers/card/data/schemas/glyphs.schema.json"), "utf-8")),
  being: JSON.parse(await readFile(resolve("src/chambers/card/data/schemas/being.schema.json"), "utf-8")),
  templates: JSON.parse(await readFile(resolve("src/chambers/card/data/schemas/templates.schema.json"), "utf-8")),
  lexicon: JSON.parse(await readFile(resolve("src/chambers/card/data/schemas/lexicon.schema.json"), "utf-8")),
  diagram: JSON.parse(await readFile(resolve("src/chambers/card/data/schemas/diagram_phrases.schema.json"), "utf-8")),
  theme: JSON.parse(await readFile(resolve("src/chambers/card/data/schemas/theme.schema.json"), "utf-8")),
  versions: JSON.parse(await readFile(resolve("src/chambers/card/data/schemas/versions.schema.json"), "utf-8"))
};

async function validate(name, dataPath, schema) {
  const data = JSON.parse(await readFile(resolve(dataPath), "utf-8"));
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    console.error(`❌ ${name} invalid:`);
    console.error(validate.errors);
    process.exitCode = 1;
  } else {
    console.log(`✅ ${name} OK`);
  }
}

// Run validations
await validate("glyphs.json", "src/chambers/card/data/glyphs.json", schemas.glyphs);
await validate("templates.json", "src/chambers/card/data/templates.json", schemas.templates);
await validate("lexicon.json", "src/chambers/card/data/lexicon.json", schemas.lexicon);
await validate("diagram_phrases.json", "src/chambers/card/data/diagram_phrases.json", schemas.diagram).catch(()=>{});
await validate("theme.json", "src/chambers/card/data/theme.json", schemas.theme).catch(()=>{});
await validate("versions.json", "src/chambers/card/data/versions.json", schemas.versions).catch(()=>{});

// Validate beings (each file)
import { readdir } from "node:fs/promises";
const dir = "src/chambers/card/data/beings";
for (const f of await readdir(dir)) {
  if (!f.endsWith(".json")) continue;
  await validate(`beings/${f}`, `${dir}/${f}`, schemas.being);
}
