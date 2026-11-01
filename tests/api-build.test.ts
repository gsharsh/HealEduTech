import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

test('the diagnostic function emits and runs using the root hosting compiler configuration', async () => {
  const root = process.cwd();
  const configuration = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile);
  assert.equal(configuration.error, undefined);
  // The hosting compiler reads root options without following project references.
  const converted = ts.convertCompilerOptionsFromJson(configuration.config.compilerOptions ?? {}, root);
  assert.deepEqual(converted.errors, []);
  const output = mkdtempSync(join(tmpdir(), 'evg-api-emission-'));
  try {
    const program = ts.createProgram([join(root, 'api/client-error.ts')], {
      ...converted.options,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ES2023,
      strict: true,
      skipLibCheck: true,
      rootDir: root,
      outDir: output,
      noEmit: false,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program).filter(item => item.category === ts.DiagnosticCategory.Error);
    assert.deepEqual(diagnostics.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')), []);
    assert.equal(program.emit().emitSkipped, false);
    writeFileSync(join(output, 'package.json'), JSON.stringify({ type: 'module' }));
    const { default: handler } = await import(pathToFileURL(resolve(output, 'api/client-error.js')).href);
    const headers = new Map<string, string>();
    const response = { statusCode: 200, setHeader(name: string, value: string) { headers.set(name, value); }, end() {} };
    handler({ method: 'GET', headers: {} }, response);
    assert.equal(response.statusCode, 405);
    assert.equal(headers.get('Allow'), 'POST');
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});
