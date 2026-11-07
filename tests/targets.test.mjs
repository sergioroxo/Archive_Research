import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/services/targets.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { parseTarget, reviewedForTarget, toggleReviewed } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const id = 'dQw4w9WgXcQ';
test('equivalent YouTube inputs share one identity and canonical watch URL', () => {
  for (const input of [id, `youtu.be/${id}?t=30`, `https://m.youtube.com/watch?v=${id}&list=PLabc`, `https://youtube.com/shorts/${id}`, `https://www.youtube-nocookie.com/embed/${id}`]) {
    const target = parseTarget(input);
    assert.equal(target.kind, 'youtube-video');
    assert.equal(target.key, `youtube:${id}`);
    assert.equal(target.canonicalUrl, `https://www.youtube.com/watch?v=${id}`);
    assert.equal(target.variants.length, 4);
  }
});
test('text, invalid schemes, malformed video URLs and web URLs are distinguished', () => {
  assert.equal(parseTarget('conference training manual').kind, 'query');
  for (const input of ['javascript:alert(1)', 'file:///private/example', 'https://youtu.be/invalid', 'https://youtube.com/watch?v=invalid', 'https://user:pass@example.com']) assert.equal(parseTarget(input).kind, 'invalid');
  assert.equal(parseTarget('https://notyoutube.com/watch?v=abc').kind, 'web');
  assert.equal(parseTarget('example.com/file.rtf#page2').canonicalUrl, 'https://example.com/file.rtf');
});
test('playlist inputs have their own canonical identity', () => {
  assert.equal(parseTarget('https://m.youtube.com/playlist?list=PLtest&si=tracking').canonicalUrl, 'https://www.youtube.com/playlist?list=PLtest');
  assert.equal(parseTarget('https://youtube.com/@nasa').kind, 'youtube-channel');
});
test('review progress is isolated per canonical target and aliases share it', () => {
  const a = parseTarget(`https://youtu.be/${id}`);
  const alias = parseTarget(id);
  const b = parseTarget('https://example.com');
  const checked = toggleReviewed({}, a.key, 'wayback');
  assert.deepEqual([...reviewedForTarget(checked, alias.key)], ['wayback']);
  assert.equal(reviewedForTarget(checked, b.key).size, 0);
  assert.equal(reviewedForTarget(toggleReviewed(checked, a.key, 'wayback'), a.key).size, 0);
});
