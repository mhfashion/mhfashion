const { readFileSync } = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(ROOT, "apps", "web", "src");
const cache = new Map();

function compile(filePath) {
  return ts.transpileModule(readFileSync(filePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filePath,
  }).outputText;
}

/**
 * Transpile and evaluate one TypeScript file. Sibling modules it imports are loaded the same way,
 * so a lib may import another lib (the editor's shape builder geometry, for example) without the
 * test having to know about it.
 */
function loadFile(filePath) {
  const resolved = path.resolve(filePath);
  const cached = cache.get(resolved);
  if (cached) return cached.exports;
  const module = { exports: {} };
  cache.set(resolved, module);
  const directory = path.dirname(resolved);
  const shimRequire = (id) => {
    if (id.startsWith("@/")) return loadFile(path.join(SRC, `${id.slice(2)}.ts`));
    if (id.startsWith(".")) return loadFile(path.resolve(directory, id.endsWith(".ts") ? id : `${id}.ts`));
    return require(id);
  };
  new Function("module", "exports", "require", compile(resolved))(module, module.exports, shimRequire);
  return module.exports;
}

/** Load a TypeScript module by its repo-relative path, e.g. `apps/web/src/lib/editor-layers.ts`. */
function loadModule(relativePath) {
  return loadFile(path.join(ROOT, relativePath));
}

module.exports = { loadModule };
