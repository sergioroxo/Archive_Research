import { useState, useMemo } from 'react';
import { archives, categories, ArchiveService } from './data/archives';

function App() {
  const [url, setUrl] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openedArchives, setOpenedArchives] = useState<Set<string>>(new Set());

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

  const handleOpenArchive = (archive: ArchiveService) => {
    if (!isValidUrl) return;
    const searchUrl = archive.searchUrl(normalizedUrl);
    window.open(searchUrl, '_blank');
    setOpenedArchives((prev) => new Set(prev).add(archive.id));
  };

  const handleOpenAll = () => {
    if (!isValidUrl) return;
    filteredArchives.forEach((archive, index) => {
      setTimeout(() => {
        const searchUrl = archive.searchUrl(normalizedUrl);
        window.open(searchUrl, '_blank');
        setOpenedArchives((prev) => new Set(prev).add(archive.id));
      }, index * 200);
    });
  };

  const handleOpenSelectedCategory = () => {
    if (!isValidUrl) return;
    const categoryArchives = filteredArchives.filter(
      (a) => selectedCategory === 'all' || a.category === selectedCategory
    );
    categoryArchives.forEach((archive, index) => {
      setTimeout(() => {
        const searchUrl = archive.searchUrl(normalizedUrl);
        window.open(searchUrl, '_blank');
        setOpenedArchives((prev) => new Set(prev).add(archive.id));
      }, index * 200);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="text-3xl">🕸️</div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Web Archive Searcher
            </h1>
            <p className="text-xs text-slate-400">Search across {archives.length}+ internet archives worldwide</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Input Section */}
        <div className="mb-8">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-sm">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Enter a URL to search across all web archives
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isValidUrl) {
                      handleOpenAll();
                    }
                  }}
                />
              </div>
              <button
                onClick={handleOpenAll}
                disabled={!isValidUrl}
                className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none flex items-center gap-2 whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Open All ({filteredArchives.length})
              </button>
            </div>
            {url && !isValidUrl && (
              <p className="mt-2 text-sm text-amber-400">Please enter a valid URL (e.g., example.com or https://example.com)</p>
            )}
            {isValidUrl && (
              <p className="mt-2 text-sm text-emerald-400">
                ✓ Searching for: <span className="font-mono text-emerald-300">{normalizedUrl}</span>
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Category Filter */}
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

          {/* Search within archives */}
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

        {/* Open by Category Button */}
        {selectedCategory !== 'all' && isValidUrl && (
          <div className="mb-6">
            <button
              onClick={handleOpenSelectedCategory}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Open all in "{categories.find(c => c.id === selectedCategory)?.name}" ({filteredArchives.length} archives)
            </button>
          </div>
        )}

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedArchives[category.id].map((archive) => (
                    <ArchiveCard
                      key={archive.id}
                      archive={archive}
                      isValidUrl={isValidUrl}
                      normalizedUrl={normalizedUrl}
                      isOpened={openedArchives.has(archive.id)}
                      onOpen={() => handleOpenArchive(archive)}
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
            <span>ℹ️</span> About This Tool
          </h3>
          <div className="text-sm text-slate-400 space-y-2">
            <p>
              This tool helps you search for any URL across <strong className="text-slate-300">{archives.length}+ web archive services</strong> worldwide.
              Simply enter a URL and click on individual archives or use "Open All" to search them simultaneously.
            </p>
            <p>
              Web archives preserve snapshots of web pages at various points in time. They're useful for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Viewing deleted or changed web pages</li>
              <li>Researching historical web content</li>
              <li>Verifying what a page looked like at a specific date</li>
              <li>OSINT (Open Source Intelligence) investigations</li>
              <li>Legal evidence preservation</li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Note: Some archives may take time to load or may not have captured the specific URL you're looking for.
              National archives typically focus on their country's web domains.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/30 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>Web Archive Searcher — A tool to search across {archives.length}+ internet archives worldwide</p>
        </div>
      </footer>
    </div>
  );
}

function ArchiveCard({
  archive,
  isValidUrl,
  normalizedUrl,
  isOpened,
  onOpen,
}: {
  archive: ArchiveService;
  isValidUrl: boolean;
  normalizedUrl: string;
  isOpened: boolean;
  onOpen: () => void;
}) {
  const searchUrl = isValidUrl ? archive.searchUrl(normalizedUrl) : null;

  return (
    <div className="group bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-slate-600/80 hover:bg-slate-800/80 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{archive.flag}</span>
          <h3 className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">
            {archive.name}
          </h3>
        </div>
        {isOpened && (
          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">✓ Opened</span>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-3">{archive.description}</p>
      {archive.notes && (
        <p className="text-xs text-slate-500 mb-3 italic">{archive.notes}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={onOpen}
          disabled={!isValidUrl}
          className="flex-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 disabled:bg-slate-700/30 disabled:text-slate-500 text-blue-400 text-xs font-medium rounded-lg transition-all border border-blue-500/30 disabled:border-slate-600/30 flex items-center justify-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Search
        </button>
        <a
          href={archive.homepage}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 bg-slate-700/30 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-lg transition-all border border-slate-600/30 flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </a>
      </div>
      {searchUrl && (
        <div className="mt-2 overflow-hidden">
          <p className="text-[10px] text-slate-600 truncate font-mono" title={searchUrl}>
            {searchUrl}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
