import { useState, useMemo, useEffect, useCallback } from 'react';
import { archives, categories, ArchiveService } from './data/archives';

// localStorage helpers
const STORAGE_KEYS = {
  checked: 'webarchive_checked',
  recentUrls: 'webarchive_recent_urls',
  viewMode: 'webarchive_view_mode',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently fail
  }
}

type ViewMode = 'compact' | 'detailed';

function App() {
  // State with localStorage persistence
  const [url, setUrl] = useState('');
  const [date, setDate] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [checkedArchives, setCheckedArchives] = useState<Set<string>>(
    () => new Set(loadFromStorage<string[]>(STORAGE_KEYS.checked, []))
  );
  const [recentUrls, setRecentUrls] = useState<string[]>(
    () => loadFromStorage<string[]>(STORAGE_KEYS.recentUrls, [])
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => loadFromStorage<ViewMode>(STORAGE_KEYS.viewMode, 'detailed')
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'text' | 'json'>('markdown');

  // Persist checked state
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.checked, Array.from(checkedArchives));
  }, [checkedArchives]);

  // Persist view mode
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.viewMode, viewMode);
  }, [viewMode]);

  const normalizeUrl = (input: string): string => {
    let normalized = input.trim();
    if (!normalized) return '';
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  };

  const normalizedUrl = normalizeUrl(url);
  const isValidUrl = useMemo(() => {
    if (!url.trim()) return false;
    try {
      new URL(normalizedUrl);
      return true;
    } catch {
      return false;
    }
  }, [url, normalizedUrl]);

  // Add to recent URLs when a valid URL is entered
  const addToRecent = useCallback((newUrl: string) => {
    if (!newUrl.trim()) return;
    setRecentUrls((prev) => {
      const filtered = prev.filter((u) => u !== newUrl);
      const updated = [newUrl, ...filtered].slice(0, 10);
      saveToStorage(STORAGE_KEYS.recentUrls, updated);
      return updated;
    });
  }, []);

  // Trigger adding to recent when URL becomes valid
  useEffect(() => {
    if (isValidUrl) {
      addToRecent(normalizedUrl);
    }
  }, [isValidUrl, normalizedUrl, addToRecent]);

  const filteredArchives = useMemo(() => {
    return archives.filter((archive) => {
      const matchesCategory = selectedCategory === 'all' || archive.category === selectedCategory;
      const matchesSearch =
        !searchFilter ||
        archive.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        archive.country.toLowerCase().includes(searchFilter.toLowerCase()) ||
        archive.description.toLowerCase().includes(searchFilter.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchFilter]);

  const groupedArchives = useMemo(() => {
    const groups: Record<string, ArchiveService[]> = {};
    filteredArchives.forEach((archive) => {
      if (!groups[archive.category]) {
        groups[archive.category] = [];
      }
      groups[archive.category].push(archive);
    });
    return groups;
  }, [filteredArchives]);

  const handleToggleCheck = (id: string) => {
    setCheckedArchives((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyLink = (archive: ArchiveService) => {
    if (!isValidUrl) return;
    const searchUrl = archive.searchUrl(normalizedUrl, date || undefined);
    navigator.clipboard.writeText(searchUrl);
    setCopiedId(archive.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllLinks = () => {
    if (!isValidUrl) return;
    const links = filteredArchives
      .map((a) => `${a.name}: ${a.searchUrl(normalizedUrl, date || undefined)}`)
      .join('\n');
    navigator.clipboard.writeText(links);
    setCopiedId('__all__');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export report generation
  const generateReport = useMemo(() => {
    if (!isValidUrl) return '';

    const dateLabel = date ? `\n**Date:** ${date}` : '';
    const timestamp = new Date().toISOString().split('T')[0];

    if (exportFormat === 'json') {
      const data = {
        url: normalizedUrl,
        date: date || null,
        generatedAt: new Date().toISOString(),
        totalArchives: filteredArchives.length,
        checkedCount: totalChecked,
        results: filteredArchives.map((a) => ({
          name: a.name,
          country: a.country,
          category: a.category,
          checked: checkedArchives.has(a.id),
          searchUrl: a.searchUrl(normalizedUrl, date || undefined),
          homepage: a.homepage,
        })),
      };
      return JSON.stringify(data, null, 2);
    }

    const checked = filteredArchives.filter((a) => checkedArchives.has(a.id));
    const unchecked = filteredArchives.filter((a) => !checkedArchives.has(a.id));

    if (exportFormat === 'markdown') {
      return `# Web Archive Search Report

**URL:** ${normalizedUrl}${dateLabel}
**Generated:** ${timestamp}
**Total Archives:** ${filteredArchives.length}
**Checked:** ${checked.length} / ${filteredArchives.length}

## ✅ Checked (${checked.length})

${checked.length > 0 ? checked.map((a) => `- [${a.flag} **${a.name}**](${a.searchUrl(normalizedUrl, date || undefined)}) — ${a.country}`).join('\n') : '_None yet_'}

## ⬜ Not Yet Checked (${unchecked.length})

${unchecked.length > 0 ? unchecked.map((a) => `- [${a.flag} ${a.name}](${a.searchUrl(normalizedUrl, date || undefined)}) — ${a.country}`).join('\n') : '_All checked!_'}

---
_Generated by Web Archive Searcher_`;
    }

    // text format
    return `WEB ARCHIVE SEARCH REPORT
==========================
URL: ${normalizedUrl}${dateLabel}
Generated: ${timestamp}
Total Archives: ${filteredArchives.length}
Checked: ${checked.length} / ${filteredArchives.length}

CHECKED (${checked.length})
${checked.length > 0 ? checked.map((a) => `  [✓] ${a.name} (${a.country})\n      ${a.searchUrl(normalizedUrl, date || undefined)}`).join('\n\n') : '  (none yet)'}

NOT YET CHECKED (${unchecked.length})
${unchecked.length > 0 ? unchecked.map((a) => `  [ ] ${a.name} (${a.country})\n      ${a.searchUrl(normalizedUrl, date || undefined)}`).join('\n\n') : '  (all checked!)'}

---
Generated by Web Archive Searcher`;
  }, [isValidUrl, normalizedUrl, date, filteredArchives, checkedArchives, exportFormat]);

  const totalChecked = filteredArchives.filter((a) => checkedArchives.has(a.id)).length;
  const totalFiltered = filteredArchives.length;
  const progress = totalFiltered > 0 ? Math.round((totalChecked / totalFiltered) * 100) : 0;

  const handleRemoveRecent = (recentUrl: string) => {
    setRecentUrls((prev) => {
      const updated = prev.filter((u) => u !== recentUrl);
      saveToStorage(STORAGE_KEYS.recentUrls, updated);
      return updated;
    });
  };

  const handleClearAllChecked = () => {
    setCheckedArchives(new Set());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🕸️</div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Web Archive Searcher
              </h1>
              <p className="text-xs text-slate-400">Search across {archives.length}+ internet archives worldwide</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isValidUrl && (
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Progress</p>
                  <p className="text-sm font-semibold text-emerald-400">{totalChecked}/{totalFiltered} checked</p>
                </div>
                <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            {/* View Toggle */}
            <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setViewMode('compact')}
                className={`px-2.5 py-1.5 text-xs transition-all ${
                  viewMode === 'compact' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Compact view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-2.5 py-1.5 text-xs transition-all ${
                  viewMode === 'detailed' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Detailed view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Input Section */}
        <div className="mb-6">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-sm">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Enter a URL to generate search links for all web archives
            </label>
            <div className="flex gap-3 flex-col sm:flex-row">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/page"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-900/80 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
              {/* Date Picker */}
              <div className="relative sm:w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-3.5 bg-slate-900/80 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all [color-scheme:dark]"
                  title="Optional: search for a specific date (supported by some archives)"
                />
              </div>
            </div>

            {/* Action buttons row */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={handleCopyAllLinks}
                disabled={!isValidUrl}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none flex items-center gap-2"
              >
                {copiedId === '__all__' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy All Links
                  </>
                )}
              </button>
              <button
                onClick={() => setShowExport(!showExport)}
                disabled={!isValidUrl}
                className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-all flex items-center gap-2 border border-slate-600/50 disabled:border-slate-700/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Report
              </button>
              {totalChecked > 0 && (
                <button
                  onClick={handleClearAllChecked}
                  className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm font-medium rounded-lg transition-all flex items-center gap-2 border border-red-700/30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear All ({totalChecked})
                </button>
              )}
            </div>

            {/* Date info */}
            {date && isValidUrl && (
              <p className="mt-2 text-xs text-amber-400">
                📅 Searching for snapshots from <strong>{date}</strong> — supported by Wayback Machine, archive.today, Arquivo.pt, and Memento
              </p>
            )}

            {url && !isValidUrl && (
              <p className="mt-2 text-sm text-amber-400">⚠ Please enter a valid URL (e.g., example.com or https://example.com)</p>
            )}
            {isValidUrl && !date && (
              <p className="mt-2 text-sm text-emerald-400">
                ✓ Ready — click "Open" on any archive to review results at your own pace
              </p>
            )}
          </div>
        </div>

        {/* Export Panel */}
        {showExport && isValidUrl && (
          <div className="mb-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <span>📤</span> Export Report
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'markdown' | 'text' | 'json')}
                  className="bg-slate-900 border border-slate-600/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="markdown">Markdown</option>
                  <option value="text">Plain Text</option>
                  <option value="json">JSON</option>
                </select>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateReport);
                    setCopiedId('__export__');
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-all flex items-center gap-1.5"
                >
                  {copiedId === '__export__' ? '✓ Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => {
                    const ext = exportFormat === 'json' ? 'json' : exportFormat === 'markdown' ? 'md' : 'txt';
                    const blob = new Blob([generateReport], { type: 'text/plain' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `web-archive-report-${Date.now()}.${ext}`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-all flex items-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            </div>
            <pre className="bg-slate-900/80 rounded-lg p-4 text-xs text-slate-300 overflow-auto max-h-64 font-mono border border-slate-700/30">
              {generateReport}
            </pre>
          </div>
        )}

        {/* Recent Searches */}
        {recentUrls.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Recent Searches</span>
              <button
                onClick={() => {
                  setRecentUrls([]);
                  saveToStorage(STORAGE_KEYS.recentUrls, []);
                }}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentUrls.map((recentUrl) => (
                <div
                  key={recentUrl}
                  className="group flex items-center gap-1 bg-slate-800/50 border border-slate-700/40 rounded-lg px-3 py-1.5 hover:border-slate-600/60 transition-all"
                >
                  <button
                    onClick={() => setUrl(recentUrl.replace(/^https?:\/\//, ''))}
                    className="text-xs text-slate-300 hover:text-white transition-colors truncate max-w-[200px]"
                    title={recentUrl}
                  >
                    {recentUrl.replace(/^https?:\/\//, '')}
                  </button>
                  <button
                    onClick={() => handleRemoveRecent(recentUrl)}
                    className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🌐 All ({archives.length})
              </button>
              {categories.map((cat) => {
                const count = archives.filter((a) => a.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cat.icon} {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>
          <div className="sm:w-64">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter archives..."
                className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Archive Groups */}
        <div className="space-y-8">
          {categories
            .filter((cat) => groupedArchives[cat.id]?.length > 0)
            .map((category) => (
              <div key={category.id}>
                <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <span className="text-xl">{category.icon}</span>
                  {category.name}
                  <span className="text-sm font-normal text-slate-400">({groupedArchives[category.id].length})</span>
                </h2>
                <div className={viewMode === 'detailed' ? 'space-y-2' : 'space-y-1'}>
                  {groupedArchives[category.id].map((archive) => (
                    <ArchiveRow
                      key={archive.id}
                      archive={archive}
                      isValidUrl={isValidUrl}
                      normalizedUrl={normalizedUrl}
                      date={date}
                      isChecked={checkedArchives.has(archive.id)}
                      isCopied={copiedId === archive.id}
                      viewMode={viewMode}
                      onToggle={() => handleToggleCheck(archive.id)}
                      onCopy={() => handleCopyLink(archive)}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>

        {/* Empty state */}
        {filteredArchives.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-slate-400">No archives match your filter criteria</p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-slate-800/30 rounded-2xl border border-slate-700/30 p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <span>ℹ️</span> How to Use
          </h3>
          <div className="text-sm text-slate-400 space-y-3">
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600/30 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <p>Enter any URL in the search box above (e.g., <code className="bg-slate-700/50 px-1.5 py-0.5 rounded text-xs text-slate-300">example.com</code>)</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600/30 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <p>Optionally pick a <strong className="text-amber-400">📅 date</strong> to see how the page looked at a specific time (Wayback Machine, archive.today, Arquivo.pt support this)</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600/30 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <p>Click <strong className="text-blue-400">"Open"</strong> on any archive to open its search page in a new tab — review the results at your own pace</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600/30 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <p>Use the <strong className="text-emerald-400">checkbox</strong> to mark archives you've already checked — progress is saved automatically</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600/30 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">5</span>
              <p>Use <strong className="text-purple-400">"Export Report"</strong> to generate a shareable report of your findings (Markdown, Text, or JSON)</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
            <p className="text-xs text-slate-500">
              💡 <strong className="text-slate-400">Deployment:</strong> This is a fully static site — works on GitHub Pages, Vercel, Netlify, or any static host. No server needed.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/30 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>Web Archive Searcher — {archives.length}+ internet archives at your fingertips</p>
        </div>
      </footer>
    </div>
  );
}

function ArchiveRow({
  archive,
  isValidUrl,
  normalizedUrl,
  date,
  isChecked,
  isCopied,
  viewMode,
  onToggle,
  onCopy,
}: {
  archive: ArchiveService;
  isValidUrl: boolean;
  normalizedUrl: string;
  date: string;
  isChecked: boolean;
  isCopied: boolean;
  viewMode: ViewMode;
  onToggle: () => void;
  onCopy: () => void;
}) {
  const searchUrl = isValidUrl ? archive.searchUrl(normalizedUrl, date || undefined) : null;

  if (viewMode === 'compact') {
    return (
      <div
        className={`group rounded-lg border transition-all ${
          isChecked
            ? 'bg-emerald-900/10 border-emerald-700/30'
            : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600/50 hover:bg-slate-800/50'
        }`}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Checkbox */}
          <button
            onClick={onToggle}
            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              isChecked
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-slate-600 hover:border-slate-400'
            }`}
          >
            {isChecked && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <span className="text-sm">{archive.flag}</span>
          <span className={`text-xs font-medium truncate flex-1 ${isChecked ? 'text-emerald-300' : 'text-slate-300'}`}>
            {archive.name}
          </span>
          <span className="text-[10px] text-slate-600 hidden md:inline">{archive.country}</span>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onCopy}
              disabled={!isValidUrl}
              className={`p-1.5 rounded transition-all ${
                isCopied
                  ? 'text-emerald-400'
                  : 'text-slate-600 hover:text-slate-300 disabled:text-slate-700'
              }`}
              title="Copy search URL"
            >
              {isCopied ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            <a
              href={isValidUrl ? searchUrl! : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                isValidUrl
                  ? 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-700/30 text-slate-600 border border-slate-600/30 cursor-not-allowed'
              }`}
            >
              Open
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Detailed view
  return (
    <div
      className={`group rounded-xl border transition-all ${
        isChecked
          ? 'bg-emerald-900/10 border-emerald-700/30'
          : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600/60 hover:bg-slate-800/60'
      }`}
    >
      <div className="flex items-center gap-3 p-3 sm:p-4">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
            isChecked
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-600 hover:border-slate-400'
          }`}
          title={isChecked ? 'Mark as unchecked' : 'Mark as checked'}
        >
          {isChecked && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base">{archive.flag}</span>
            <h3 className={`font-semibold text-sm ${isChecked ? 'text-emerald-300' : 'text-slate-200'}`}>
              {archive.name}
            </h3>
            <span className="text-[10px] bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded hidden sm:inline">
              {archive.country}
            </span>
            {archive.supportsDate && date && (
              <span className="text-[10px] bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                📅 Date supported
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{archive.description}</p>
          {searchUrl && (
            <p className="text-[10px] text-slate-600 truncate font-mono mt-1" title={searchUrl}>
              → {searchUrl}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <a
            href={archive.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-all"
            title="Visit homepage"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </a>
          <button
            onClick={onCopy}
            disabled={!isValidUrl}
            className={`p-2 rounded-lg transition-all ${
              isCopied
                ? 'text-emerald-400 bg-emerald-500/20'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 disabled:text-slate-700 disabled:hover:bg-transparent'
            }`}
            title="Copy search URL"
          >
            {isCopied ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
          </button>
          <a
            href={isValidUrl ? searchUrl! : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              isValidUrl
                ? 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30'
                : 'bg-slate-700/30 text-slate-600 border border-slate-600/30 cursor-not-allowed'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
