const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
let failures = 0;
function inspect(directory) {
  for (const entry of fs.readdirSync(directory)) {
    const file = path.join(directory, entry);
    if (fs.statSync(file).isDirectory()) { inspect(file); continue; }
    if (!/\.tsx?$/.test(file)) continue;
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isFunctionLike(node) && node.body) {
        const start = source.getLineAndCharacterOfPosition(node.getStart(source)).line;
        const length = source.getLineAndCharacterOfPosition(node.end).line - start + 1;
        if (length >= 40 || !node.type || node.parameters.some((parameter) => !parameter.type)) {
          console.error(`${file}:${start + 1}: functions require explicit types and fewer than 40 lines (${length})`);
          failures++;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
inspect('src');
if (failures) process.exitCode = 1;
else console.log('Function size and explicit type checks passed.');
