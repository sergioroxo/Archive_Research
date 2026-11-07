export type ResearchTarget = {
  kind: 'web' | 'youtube-video' | 'youtube-playlist' | 'youtube-channel' | 'query' | 'invalid';
  original: string;
  canonicalUrl: string;
  key: string;
  videoId?: string;
  variants: string[];
};

const youtubeHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const shortHosts = new Set(['youtu.be', 'www.youtu.be']);

export function youtubeVideoId(input: string): string | null {
  if (/^[\w-]{11}$/.test(input.trim())) return input.trim();
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    let id: string | null = null;
    if (shortHosts.has(url.hostname)) id = parts.length === 1 ? parts[0] : null;
    if (youtubeHosts.has(url.hostname)) {
      id = /^\/watch\/?$/.test(url.pathname) ? url.searchParams.get('v') : parts.length === 2 && ['shorts', 'embed', 'live', 'v'].includes(parts[0]) ? parts[1] : null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function parseTarget(input: string): ResearchTarget {
  const original = input.trim();
  const invalid: ResearchTarget = { original, kind: 'invalid', canonicalUrl: '', key: '', variants: [] };
  if (!original) return invalid;
  const bareId = /^[\w-]{11}$/.test(original) ? original : null;
  // Words/phrases remain discovery queries, rather than becoming fake web addresses.
  if (!bareId && !/^https?:\/\//i.test(original) && !/^[^\s/]+\.[^\s/]+(?:[/:?#]|$)/.test(original)) {
    return { ...invalid, kind: /^(?:[a-z][\w+.-]*:|\/\/)/i.test(original) ? 'invalid' : 'query', key: `query:${original.toLowerCase()}` };
  }
  try {
    const url = new URL(bareId ? `https://www.youtube.com/watch?v=${bareId}` : /^https?:\/\//i.test(original) ? original : `https://${original}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return invalid;
    url.hash = '';
    const id = youtubeVideoId(url.href);
    if (id) {
      const canonicalUrl = `https://www.youtube.com/watch?v=${id}`;
      return { original, kind: 'youtube-video', canonicalUrl, key: `youtube:${id}`, videoId: id, variants: [canonicalUrl, `http://www.youtube.com/watch?v=${id}`, `https://youtube.com/watch?v=${id}`, `https://youtu.be/${id}`] };
    }
    let kind: ResearchTarget['kind'] = 'web';
    if (youtubeHosts.has(url.hostname)) {
      if (url.searchParams.has('list')) kind = 'youtube-playlist';
      else if (/^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)/.test(url.pathname)) kind = 'youtube-channel';
      else return invalid;
    }
    if (shortHosts.has(url.hostname)) return invalid;
    if (kind === 'youtube-playlist') {
      const list = url.searchParams.get('list')!;
      if (!/^[\w-]+$/.test(list)) return invalid;
      url.href = `https://www.youtube.com/playlist?list=${encodeURIComponent(list)}`;
    }
    const canonicalUrl = url.href;
    return { original, kind, canonicalUrl, key: canonicalUrl, variants: [canonicalUrl] };
  } catch { return invalid; }
}

export function reviewedForTarget(records: Record<string, string[]>, key: string): Set<string> {
  return new Set(key && Array.isArray(records[key]) ? records[key].filter((v) => typeof v === 'string') : []);
}

export function toggleReviewed(records: Record<string, string[]>, key: string, archiveId: string): Record<string, string[]> {
  if (!key || key.startsWith('query:')) return records;
  const checked = reviewedForTarget(records, key);
  if (checked.has(archiveId)) checked.delete(archiveId); else checked.add(archiveId);
  return { ...records, [key]: [...checked] };
}
