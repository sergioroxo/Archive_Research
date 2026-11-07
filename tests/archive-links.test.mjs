import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/data/archives.ts', import.meta.url), 'utf8');
const targetSource = await readFile(new URL('../src/services/targets.ts', import.meta.url), 'utf8');
const targetModule = ts.transpileModule(targetSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const targetImport = `data:text/javascript;base64,${Buffer.from(targetModule).toString('base64')}`;
const linkedSource = source.replaceAll("'../services/targets'", JSON.stringify(targetImport));
const { outputText } = ts.transpileModule(linkedSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { archives, youtubeVideoId } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const id = 'dQw4w9WgXcQ';
test('YouTube URLs resolve video IDs across supported formats', () => {
  for (const url of [`https://youtube.com/watch?v=${id}&list=PLtest`, `https://youtu.be/${id}?t=3`, `https://www.youtube.com/shorts/${id}`, `https://m.youtube.com/live/${id}`, `https://www.youtube-nocookie.com/embed/${id}`]) assert.equal(youtubeVideoId(url), id);
});
test('unrelated hosts and playlist-only URLs are not treated as videos', () => {
  for (const url of [`https://youtube.com.evil.example/watch?v=${id}`, `https://notyoutube.com/watch?v=${id}`, 'https://youtube.com/playlist?list=PLtest', 'https://youtu.be/invalid', 'invalid']) assert.equal(youtubeVideoId(url), null);
});
test('new tools encode full queries and use home pages for unrelated URLs', () => {
  const entry = (id) => archives.find(a => a.id === id);
  const url = `https://youtube.com/watch?v=${id}&list=PLtest`;
  assert.equal(new URL(entry('archivarix-echo').searchUrl(url)).searchParams.get('q'), url);
  assert.equal(new URL(entry('archivarix-tube').searchUrl(url)).searchParams.get('q'), id);
  assert.equal(entry('filmot').searchUrl(url), `https://filmot.com/video/${id}`);
  assert.equal(new URL(entry('quite-a-playlist').searchUrl(url)).searchParams.get('url'), url);
  for (const id of ['filmot', 'archivarix-tube', 'quite-a-playlist']) assert.equal(entry(id).searchUrl('https://example.com/document.rtf'), entry(id).homepage);
});
