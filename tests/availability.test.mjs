import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/services/availability.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { checkAvailability, checkTargetAvailability, checkCommonCrawl } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const reply = (body, status = 200) => async () => new Response(JSON.stringify(body), { status });

test('Wayback confirms a snapshot and upgrades replay link to HTTPS', async () => {
  const result = await checkAvailability('wayback', 'https://example.com', undefined, reply({ archived_snapshots: { closest: { available: true, status: '200', url: 'http://web.archive.org/web/20200101000000/https://example.com', timestamp: '20200101000000' } } }));
  assert.equal(result.status, 'found');
  assert.match(result.snapshotUrl, /^https:\/\/web.archive.org\//);
});

test('only valid empty responses mean not found', async () => {
  assert.equal((await checkAvailability('wayback', 'https://example.com', undefined, reply({ archived_snapshots: {} }))).status, 'not-found');
  assert.equal((await checkAvailability('arquivo-pt', 'https://example.com', undefined, reply({ response_items: [] }))).status, 'not-found');
  for (const body of [{}, null, { error: 'unavailable' }]) {
    assert.equal((await checkAvailability('wayback', 'https://example.com', undefined, reply(body))).status, 'error');
    assert.equal((await checkAvailability('arquivo-pt', 'https://example.com', undefined, reply(body))).status, 'error');
  }
});

test('Arquivo uses URL history with an encoded URL, and returns its snapshot', async () => {
  const fetcher = async (url) => {
    const endpoint = new URL(url);
    assert.equal(endpoint.searchParams.get('versionHistory'), 'https://example.com/page?a=1&b=2');
    assert.equal(endpoint.searchParams.get('maxItems'), '1');
    return reply({ response_items: [{ linkToArchive: 'https://arquivo.pt/wayback/20200101000000/https://example.com/', tstamp: '20200101000000' }] })();
  };
  assert.equal((await checkAvailability('arquivo-pt', 'https://example.com/page?a=1&b=2#section', undefined, fetcher)).status, 'found');
});

test('network failures, invalid JSON and rate limiting are errors', async () => {
  const fetchers = [async () => { throw new TypeError('Failed to fetch'); }, reply({}, 429), async () => new Response('not json')];
  for (const fetcher of fetchers) assert.equal((await checkAvailability('arquivo-pt', 'https://example.com', undefined, fetcher)).status, 'error');
});

test('untrusted replay hosts cannot become snapshot links', async () => {
  const result = await checkAvailability('arquivo-pt', 'https://example.com', undefined, reply({ response_items: [{ linkToArchive: 'https://evil.example/' }] }));
  assert.equal(result.status, 'error');
  assert.equal(result.snapshotUrl, undefined);
});

test('timeout aborts the request without reporting a missing snapshot', async () => {
  const fetcher = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  const result = await checkAvailability('wayback', 'https://example.com', undefined, fetcher, 5);
  assert.equal(result.status, 'error');
  assert.match(result.message, /timed out/);
});


test('variant lookup finds canonical evidence after a missing variant', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return calls === 1 ? reply({ archived_snapshots: {} })() : reply({ archived_snapshots: { closest: { available: true, status: '200', url: 'https://web.archive.org/web/20200101000000/https://youtube.com/watch?v=dQw4w9WgXcQ' } } })();
  };
  const result = await checkTargetAvailability('wayback', ['https://youtu.be/dQw4w9WgXcQ', 'https://youtube.com/watch?v=dQw4w9WgXcQ'], undefined, fetcher);
  assert.equal(result.status, 'found');
  assert.equal(result.evidenceType, 'watch-page');
  assert.equal(result.attemptedUrls.length, 2);
});
test('partial checks and rate limits never produce a false not-found', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return reply({}, 429)(); };
  const result = await checkTargetAvailability('wayback', ['https://example.com', 'http://example.com'], undefined, fetcher);
  assert.equal(result.status, 'error');
  assert.equal(calls, 1);
});
test('cancelled lookup does not send requests', async () => {
  const controller = new AbortController(); controller.abort();
  const result = await checkTargetAvailability('wayback', ['https://example.com'], controller.signal, async () => { throw new Error('must not fetch'); });
  assert.equal(result.status, 'error');
  assert.deepEqual(result.attemptedUrls, []);
});


const crawlCatalogue = [{id:'CC-MAIN-2026-34'}, {id:'CC-MAIN-2026-43'}, {id:'CC-MAIN-2026-39'}, {id:'CC-MAIN-2026-30'}];
const crawlRecord = {url:'https://example.com/',timestamp:'20261005112841',status:'200',filename:'crawl-data/CC-MAIN-2026-43/segments/test.warc.gz'};

test('Common Crawl returns an index link, not a fabricated replay URL', async () => {
  const calls=[];
  const fetcher = async (url) => {
    calls.push(url);
    if(url.endsWith('collinfo.json')) return reply(crawlCatalogue)();
    const query=new URL(url);
    assert.equal(query.origin, 'https://index.commoncrawl.org');
    assert.equal(query.searchParams.get('matchType'),'exact');
    assert.equal(query.searchParams.get('filter'),'=status:200');
    assert.equal(query.searchParams.get('limit'),'1');
    return new Response(JSON.stringify(crawlRecord)+'\n');
  };
  const result = await checkTargetAvailability('common-crawl',['https://example.com/','http://example.com/'],undefined,fetcher);
  assert.equal(result.status,'found');
  assert.equal(result.evidenceType,'crawl-record');
  assert.equal(result.snapshotUrl,undefined);
  assert.match(result.recordUrl,/CC-MAIN-2026-43-index/);
  assert.deepEqual(result.checkedIndexes,['CC-MAIN-2026-43']);
  assert.equal(calls.length,2);
});
test('missing Common Crawl results are limited to three recent indexes', async () => {
  const calls=[];
  const fetcher=async url=>{calls.push(url);return url.endsWith('collinfo.json') ? reply(crawlCatalogue)() : reply({message:'No Captures found for: example.com'},404)();};
  const result=await checkCommonCrawl('https://example.com',undefined,fetcher);
  assert.equal(result.status,'not-found');
  assert.deepEqual(result.checkedIndexes,['CC-MAIN-2026-43','CC-MAIN-2026-39','CC-MAIN-2026-34']);
  assert.match(result.scope,/not the full archive/);
  assert.match(result.message,/Older crawls/);
  assert.equal(calls.length,4);
});
test('Common Crawl errors stop the scan and never become a missing result', async () => {
  for(const response of [new Response('rate limited',{status:503}),new Response('<html>Not found</html>',{status:404}),new Response(''),new Response('{broken')]){
    let calls=0;
    const result=await checkCommonCrawl('https://example.com',undefined,async url=>{calls++;return url.endsWith('collinfo.json')?reply(crawlCatalogue)():response;});
    assert.equal(result.status,'error');
    assert.equal(calls,2);
  }
});
test('malformed or unsafe Common Crawl catalogues and mismatched records are rejected', async () => {
  for(const body of [{error:'broken'},[{id:'https://evil.example'}]]){
    assert.equal((await checkCommonCrawl('https://example.com',undefined,reply(body))).status,'error');
  }
  const result=await checkCommonCrawl('https://example.com',undefined,async url=>url.endsWith('collinfo.json')?reply(crawlCatalogue)():reply({...crawlRecord,url:'https://unrelated.example/'} )());
  assert.equal(result.status,'error');
  assert.equal(result.recordUrl,undefined);
});
test('Common Crawl cancellation sends no requests and timeout is an error', async () => {
  const controller=new AbortController();controller.abort();
  assert.equal((await checkCommonCrawl('https://example.com',controller.signal,async()=>{throw Error('must not fetch');})).status,'error');
  const fetcher=(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));
  const result=await checkCommonCrawl('https://example.com',undefined,fetcher,5);
  assert.equal(result.status,'error');
  assert.match(result.message,/timed out/);
});

test('an upstream 504 falls back to the next crawl index', async () => {
  let indexCalls=0;
  const fetcher=async url=>{
    if(url.endsWith('collinfo.json')) return reply(crawlCatalogue)();
    indexCalls++;
    return indexCalls===1 ? new Response('gateway timeout',{status:504}) : reply(crawlRecord)();
  };
  const result=await checkCommonCrawl('https://example.com/',undefined,fetcher);
  assert.equal(result.status,'found');
  assert.deepEqual(result.failedIndexes,['CC-MAIN-2026-43']);
  assert.deepEqual(result.checkedIndexes,['CC-MAIN-2026-39']);
});
test('timeout in one crawl plus empty remaining crawls is incomplete, not absent', async () => {
  let indexCalls=0;
  const fetcher=async url=>{
    if(url.endsWith('collinfo.json')) return reply(crawlCatalogue)();
    indexCalls++;
    return indexCalls===1 ? new Response('gateway timeout',{status:504}) : reply({error:'No captures found for: example.com'},404)();
  };
  const result=await checkCommonCrawl('https://example.com/',undefined,fetcher);
  assert.equal(result.status,'error');
  assert.equal(indexCalls,3);
  assert.equal(result.checkedIndexes.length,2);
  assert.match(result.message,/No absence can be concluded/);
});
