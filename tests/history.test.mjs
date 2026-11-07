import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/services/history.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { readHistoryBackup, mergeReviewed } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const backup = { format:'archive-research-history', version:1, recentUrls:['https://example.com/'], checkedByTarget:{'https://example.com/':['wayback']}, legacyChecked:['arquivo-pt'] };
test('history backups preserve target marks and legacy marks separately', () => {
  const parsed = readHistoryBackup(JSON.parse(JSON.stringify(backup)));
  assert.deepEqual(parsed.checkedByTarget['https://example.com/'], ['wayback']);
  assert.deepEqual(parsed.legacyChecked,['arquivo-pt']);
});
test('import merges marks without removing previous research progress', () => {
  const merged = mergeReviewed({'https://example.com/':['arquivo-pt'], 'youtube:abc':['wayback']}, backup.checkedByTarget);
  assert.deepEqual(merged['https://example.com/'], ['arquivo-pt','wayback']);
  assert.deepEqual(merged['youtube:abc'], ['wayback']);
});
test('invalid formats, unsafe URLs and object keys are rejected', () => {
  for (const data of [{}, {...backup, version:2}, {...backup,recentUrls:['javascript:alert(1)']}, {...backup,checkedByTarget:JSON.parse('{"__proto__":[]}')}, {...backup,checkedByTarget:{key:'wayback'}}]) assert.throws(()=>readHistoryBackup(data));
});
