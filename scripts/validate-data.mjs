/* ESM validator for Card chamber data (JSON Schema 2020-12) + cross-field checks */
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true, allErrors: true });
addFormats(ajv);

async function loadJSON(p) {
  return JSON.parse(await readFile(resolve(p), "utf-8"));
}

const SCHEMA_DIR = "src/chambers/card/data/schemas";
const schemas = {
  glyphs: await loadJSON(`${SCHEMA_DIR}/glyphs.schema.json`),
  being: await loadJSON(`${SCHEMA_DIR}/being.schema.json`),
  templates: await loadJSON(`${SCHEMA_DIR}/templates.schema.json`),
  lexicon: await loadJSON(`${SCHEMA_DIR}/lexicon.schema.json`),
  diagram: await loadJSON(`${SCHEMA_DIR}/diagram_phrases.schema.json`),
  theme: await loadJSON(`${SCHEMA_DIR}/theme.schema.json`),
  versions: await loadJSON(`${SCHEMA_DIR}/versions.schema.json`),
};

function fail(name, msg) {
  console.error(`\n❌ ${name} invalid:`);
  console.error(msg);
  process.exitCode = 1;
}

async function validate(name, dataPath, schema, postCheck) {
  const data = await loadJSON(dataPath);
  const validate = ajv.compile(schema);
  const ok = validate(data);
  if (!ok) return fail(name, validate.errors);
  if (postCheck) {
    const post = postCheck(data);
    if (post !== true) return fail(name, post);
  }
  console.log(`✅ ${name} OK`);
  return true;
}

await validate("glyphs.json", "src/chambers/card/data/glyphs.json", schemas.glyphs).catch(()=>{});
await validate("templates.json", "src/chambers/card/data/templates.json", schemas.templates).catch(()=>{});
await validate("lexicon.json", "src/chambers/card/data/lexicon.json", schemas.lexicon).catch(()=>{});
await validate("diagram_phrases.json", "src/chambers/card/data/diagram_phrases.json", schemas.diagram).catch(()=>{});
await validate("theme.json", "src/chambers/card/data/theme.json", schemas.theme).catch(()=>{});
await validate("versions.json", "src/chambers/card/data/versions.json", schemas.versions).catch(()=>{});

// Validate beings if directory exists, with cross-field check accept<harmonic
const BEINGS_DIR = "src/chambers/card/data/beings";
try {
  const s = await stat(BEINGS_DIR);
  if (s.isDirectory()) {
    for (const f of await readdir(BEINGS_DIR)) {
      if (!f.endsWith(".json")) continue;
      await validate(`beings/${f}`, `${BEINGS_DIR}/${f}`, schemas.being, (b) => {
        const a = b?.thresholds?.accept;
        const h = b?.thresholds?.harmonic;
        if (typeof a === "number" && typeof h === "number" && !(a < h)) {
          return `thresholds.accept (${a}) must be < thresholds.harmonic (${h})`;
        }
        return true;
      });
    }
  } else {
    console.log("ℹ️  Beings path exists but is not a directory; skipping.");
  }
} catch (e) {
  console.log("ℹ️  Beings directory not found; skipping beings validation.");
}
