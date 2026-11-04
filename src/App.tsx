import { useState, useMemo } from 'react';
import { archives, categories, ArchiveService } from './data/archives';

function App() {
  const [url, setUrl] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [checkedArchives, setCheckedArchives] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    const searchUrl = archive.searchUrl(normalizedUrl);
    navigator.clipboard.writeText(searchUrl);
    setCopiedId(archive.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllLinks = () => {
    if (!isValidUrl) return;
    const links = filteredArchives
      .map((a) => `${a.name}: ${a.searchUrl(normalizedUrl)}`)
      .join('\n');
    navigator.clipboard.writeText(links);
    setCopiedId('__all__');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalChecked = checkedArchives.size;
  const totalFiltered = filteredArchives.length;
  const progress = totalFiltered > 0 ? Math.round((totalChecked / totalFiltered) * 100) : 0;

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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Input Section */}
        <div className="mb-8">
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
              <button
                onClick={handleCopyAllLinks}
                disabled={!isValidUrl}
                className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none flex items-center gap-2 whitespace-nowrap"
              >
                {copiedId === '__all__' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy All Links
                  </>
                )}
              </button>
            </div>
            {url && !isValidUrl && (
              <p className="mt-2 text-sm text-amber-400">⚠ Please enter a valid URL (e.g., example.com or https://example.com)</p>
            )}
            {isValidUrl && (
              <p className="mt-2 text-sm text-emerald-400">
                ✓ Ready — click any archive below to open it, or check them off as you go
              </p>
            )}
          </div>
        </div>

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
                <div className="space-y-2">
                  {groupedArchives[category.id].map((archive) => (
                    <ArchiveRow
                      key={archive.id}
                      archive={archive}
                      isValidUrl={isValidUrl}
                      normalizedUrl={normalizedUrl}
                      isChecked={checkedArchives.has(archive.id)}
                      isCopied={copiedId === archive.id}
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
              <p>Click <strong className="text-blue-400">"Open"</strong> on any archive to open its search page in a new tab — review the results at your own pace</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600/30 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <p>Use the <strong className="text-emerald-400">checkbox</strong> to mark archives you've already checked — track your progress</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600/30 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <p>Use <strong className="text-purple-400">"Copy"</strong> to copy a single link, or <strong className="text-purple-400">"Copy All Links"</strong> to get all search URLs at once</p>
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
  isChecked,
  isCopied,
  onToggle,
  onCopy,
}: {
  archive: ArchiveService;
  isValidUrl: boolean;
  normalizedUrl: string;
  isChecked: boolean;
  isCopied: boolean;
  onToggle: () => void;
  onCopy: () => void;
}) {
  const searchUrl = isValidUrl ? archive.searchUrl(normalizedUrl) : null;

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
