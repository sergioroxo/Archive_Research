export type HistoryBackup = {
  format: 'archive-research-history';
  version: 1;
  exportedAt: string;
  recentUrls: string[];
  checkedByTarget: Record<string, string[]>;
  legacyChecked: string[];
};

export function readHistoryBackup(value: unknown): HistoryBackup {
  if (!value || typeof value !== 'object') throw new Error('Not a history backup.');
  const data = value as Partial<HistoryBackup>;
  if (data.format !== 'archive-research-history' || data.version !== 1 || !Array.isArray(data.recentUrls) || !data.checkedByTarget || typeof data.checkedByTarget !== 'object' || Array.isArray(data.checkedByTarget)) throw new Error('Unsupported history backup format.');
  if (data.recentUrls.length > 10000 || Object.keys(data.checkedByTarget).length > 10000) throw new Error('Backup is too large.');
  const checkedByTarget: Record<string, string[]> = Object.create(null);
  for (const [key, ids] of Object.entries(data.checkedByTarget)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key) || key.length > 10000 || !Array.isArray(ids) || ids.length > 1000 || ids.some((id) => typeof id !== 'string' || id.length > 200)) throw new Error('Invalid review history.');
    checkedByTarget[key] = [...new Set(ids)];
  }
  const recentUrls = data.recentUrls.filter((url): url is string => {
    if (typeof url !== 'string' || url.length > 10000) return false;
    try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password; } catch { return false; }
  });
  if (recentUrls.length !== data.recentUrls.length) throw new Error('Backup contains invalid URLs.');
  return { format: 'archive-research-history', version: 1, exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '', recentUrls: [...new Set(recentUrls)], checkedByTarget, legacyChecked: Array.isArray(data.legacyChecked) ? data.legacyChecked.filter((id): id is string => typeof id === 'string').slice(0, 1000) : [] };
}

export function mergeReviewed(current: Record<string, string[]>, incoming: Record<string, string[]>): Record<string, string[]> {
  const merged = { ...current };
  for (const [key, ids] of Object.entries(incoming)) merged[key] = [...new Set([...(Array.isArray(merged[key]) ? merged[key] : []), ...ids])];
  return merged;
}
