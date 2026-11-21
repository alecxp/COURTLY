import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const tsPath = '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const ts = require(tsPath);
const root = process.cwd();
function walk(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(path.join(dir,entry.name)) : [path.join(dir,entry.name)]); }
const files = [...walk(path.join(root,'app')).filter(f => /\.(tsx?|jsx?)$/.test(f)), ...walk(path.join(root,'lib')).filter(f => /\.(tsx?|jsx?)$/.test(f))];
let errors = 0;
for (const file of files) {
  const source = fs.readFileSync(file,'utf8');
  const result = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
  const diagnostics = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  if (diagnostics.length) {
    errors += diagnostics.length;
    console.error('FAIL syntax', path.relative(root,file));
    for (const d of diagnostics) console.error(ts.flattenDiagnosticMessageText(d.messageText,'\n'));
  } else console.log('PASS syntax', path.relative(root,file));
}
console.log(`RESULT: ${files.length-errors} syntax checks passed, ${errors} errors across ${files.length} source files`);
process.exitCode = errors ? 1 : 0;
