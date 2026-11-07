export const automaticArchiveIds = ['wayback', 'arquivo-pt'] as const;
export type AutomaticArchiveId = typeof automaticArchiveIds[number];
export type Availability = {
  status: 'checking' | 'found' | 'not-found' | 'error';
  message: string;
  snapshotUrl?: string;
  timestamp?: string;
  checkedAt?: string;
  queriedUrl?: string;
  attemptedUrls?: string[];
  evidenceType?: 'web-page' | 'watch-page';
};

// Only link to replay URLs on the archive's own host, even if an API is compromised.
function replayUrl(value: unknown, host: string): string {
  if (typeof value !== 'string') throw new Error('Invalid snapshot URL');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.hostname !== host || url.username || url.password || url.port) {
    throw new Error('Invalid snapshot URL');
  }
  url.protocol = 'https:';
  return url.href;
}

const cache = new Map<string, { expires: number; result: Availability }>();

// A missing short-link snapshot does not imply the canonical watch page is missing.
export async function checkTargetAvailability(
  archive: AutomaticArchiveId,
  variants: string[],
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<Availability> {
  const attemptedUrls: string[] = [];
  let failure: Availability | undefined;
  let last: Availability | undefined;
  for (const url of [...new Set(variants)].slice(0, 4)) {
    if (signal?.aborted) return { status: 'error', message: 'Check cancelled.', attemptedUrls };
    attemptedUrls.push(url);
    const key = `${archive}:${url}`;
    const cached = fetcher === fetch ? cache.get(key) : undefined;
    const result = cached && cached.expires > Date.now() ? cached.result : await checkAvailability(archive, url, signal, fetcher);
    if (fetcher === fetch && ['found', 'not-found'].includes(result.status)) cache.set(key, { expires: Date.now() + 300000, result });
    last = { ...result, queriedUrl: url, attemptedUrls: [...attemptedUrls], evidenceType: /youtube\.com|youtu\.be/.test(new URL(url).hostname) ? 'watch-page' : 'web-page' };
    if (result.status === 'found') return last;
    if (result.status === 'error') {
      failure = last;
      // Do not multiply requests when a provider is rate limiting or unreachable.
      break;
    }
  }
  return failure || last || { status: 'error', message: 'No valid URL was available to check.' };
}

export async function checkAvailability(
  archive: AutomaticArchiveId,
  targetUrl: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
  timeoutMs = 20000,
): Promise<Availability> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, timeoutMs);
  const checkedAt = new Date().toISOString();
  try {
    const target = new URL(targetUrl);
    if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Invalid target URL');
    target.hash = '';
    const endpoint = archive === 'wayback'
      ? new URL('https://archive.org/wayback/available')
      : new URL('https://arquivo.pt/textsearch');
    endpoint.searchParams.set(archive === 'wayback' ? 'url' : 'versionHistory', target.href);
    if (archive === 'arquivo-pt') endpoint.searchParams.set('maxItems', '1');
    const response = await fetcher(endpoint.href, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) {
      return { status: 'error', checkedAt, message: response.status === 429 ? 'Rate limit reached. Try again later.' : `Archive service returned HTTP ${response.status}. Try again.` };
    }
    const data = await response.json();
    if (archive === 'wayback') {
      if (!data || typeof data.archived_snapshots !== 'object' || data.archived_snapshots === null || Array.isArray(data.archived_snapshots)) throw new Error('Unexpected response');
      const closest = data.archived_snapshots.closest;
      if (!closest || closest.available === false) return { status: 'not-found', checkedAt, message: 'No available snapshot returned for this URL.' };
      if (closest.available !== true || String(closest.status) !== '200') throw new Error('Unexpected snapshot');
      return { status: 'found', checkedAt, message: 'Snapshot found', snapshotUrl: replayUrl(closest.url, 'web.archive.org'), timestamp: closest.timestamp };
    }
    if (!data || !Array.isArray(data.response_items)) throw new Error('Unexpected response');
    if (data.response_items.length === 0) return { status: 'not-found', checkedAt, message: 'No snapshot returned for this URL.' };
    const item = data.response_items[0];
    return { status: 'found', checkedAt, message: 'Snapshot found', snapshotUrl: replayUrl(item.linkToArchive, 'arquivo.pt'), timestamp: item.tstamp };
  } catch {
    return { status: 'error', checkedAt, message: controller.signal.aborted ? 'Check timed out or was cancelled. Try again.' : 'Could not check: network, browser restrictions, or unexpected archive response. Try again or search manually.' };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
